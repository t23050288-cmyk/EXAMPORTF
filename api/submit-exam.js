import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try { jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Unauthorized' }) }

  const { usn, answers } = req.body

  const { data: questions } = await supabase.from('questions').select('id, correct_answer, marks')
  const { data: config } = await supabase.from('exam_config').select('marks_per_question, negative_marks').single()

  let correct = 0, wrong = 0, skipped = 0, score = 0
  const total = questions?.length || 0

  questions?.forEach(q => {
    const ans = answers[q.id]
    if (!ans) { skipped++; return }
    if (ans === q.correct_answer) { correct++; score += (q.marks || config?.marks_per_question || 1) }
    else { wrong++; score += (config?.negative_marks || 0) }
  })

  score = Math.max(0, score)

  await supabase.from('exam_status').update({
    status: 'submitted', score, correct, wrong, skipped, submitted_at: new Date().toISOString()
  }).eq('usn', usn)

  // Save all answers
  const answerRows = Object.entries(answers).map(([question_id, answer]) => ({ usn, question_id, answer }))
  if (answerRows.length > 0) {
    await supabase.from('student_answers').upsert(answerRows, { onConflict: 'usn,question_id' })
  }

  res.json({ result: { correct, wrong, skipped, score, total } })
}
