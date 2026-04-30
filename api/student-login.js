import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { usn, password } = req.body
  if (!usn || !password) return res.status(400).json({ error: 'USN and password required' })

  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('usn', usn.toUpperCase().trim())
    .single()

  if (error || !student) return res.status(401).json({ error: 'Invalid USN or password' })
  if (student.password !== password) return res.status(401).json({ error: 'Invalid USN or password' })

  // Upsert exam_status (don't overwrite in_progress)
  const { data: existing } = await supabase
    .from('exam_status')
    .select('status')
    .eq('usn', student.usn)
    .single()

  if (!existing) {
    await supabase.from('exam_status').insert({
      usn: student.usn,
      student_name: student.name,
      branch: student.branch,
      section: student.section || '',
      status: 'not_started',
      warnings: 0,
      score: 0
    })
  }

  const token = jwt.sign(
    { usn: student.usn, name: student.name },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  )

  res.json({
    student: {
      usn: student.usn,
      name: student.name,
      email: student.email,
      branch: student.branch,
      section: student.section || ''
    },
    token
  })
}
