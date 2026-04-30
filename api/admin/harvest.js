import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export const config = { api: { bodyParser: false } }

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  return lines.slice(1).map(line => {
    // Handle quoted commas in CSV
    const cols = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue }
      if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue }
      cur += line[i]
    }
    cols.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] || '' })
    return obj
  })
}

function normalizeRow(row, examIdentity, branch) {
  // Try to find question text from various column names
  const qText = row.question || row.question_text || row.q || row.question_no || ''
  const optA = row.option_a || row.a || row.opt_a || row.option1 || row.choice_a || ''
  const optB = row.option_b || row.b || row.opt_b || row.option2 || row.choice_b || ''
  const optC = row.option_c || row.c || row.opt_c || row.option3 || row.choice_c || ''
  const optD = row.option_d || row.d || row.opt_d || row.option4 || row.choice_d || ''
  const correct = (row.correct_answer || row.answer || row.correct || row.ans || 'A').toString().toUpperCase().trim().charAt(0)
  const marks = parseInt(row.marks || row.mark || '1') || 1
  const order = parseInt(row.order || row.order_index || row.sno || '1') || 1

  if (!qText || !optA || !optB) return null // skip empty rows

  return {
    question_text: qText,
    option_a: optA,
    option_b: optB,
    option_c: optC,
    option_d: optD,
    correct_answer: ['A','B','C','D'].includes(correct) ? correct : 'A',
    marks,
    order_index: order,
    exam_identity: examIdentity || row.exam_identity || 'General',
    branch: branch || row.branch || 'General'
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'File parse error' })

    const folder = (fields.folder?.[0] || fields.folder || '').toString().trim() || 'General'
    const branch = (fields.branch?.[0] || fields.branch || '').toString().trim() || 'General'
    const countLimit = parseInt(fields.count?.[0] || fields.count || '0') || 0

    const file = files.file?.[0] || files.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    const ext = path.extname(file.originalFilename || file.name || '').toLowerCase()
    const content = fs.readFileSync(file.filepath || file.path, 'utf-8')

    let rows = []
    if (ext === '.csv') {
      rows = parseCSV(content)
    } else {
      return res.status(400).json({ error: 'Only CSV supported. Convert Excel to CSV first.' })
    }

    let questions = rows.map(r => normalizeRow(r, folder, branch)).filter(Boolean)

    // Random sample if count specified
    if (countLimit > 0 && questions.length > countLimit) {
      questions = questions.sort(() => Math.random() - 0.5).slice(0, countLimit)
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found. Check CSV columns: question, option_a, option_b, option_c, option_d, correct_answer' })
    }

    // Insert in batches
    const batchSize = 50
    let imported = 0
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize)
      const { error } = await supabase.from('questions').insert(batch)
      if (!error) imported += batch.length
    }

    res.json({ imported, total: questions.length, folder })
  })
}
