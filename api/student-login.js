import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { usn, password } = req.body
  if (!usn || !password) return res.status(400).json({ error: 'USN and password required' })

  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .eq('usn', usn.toUpperCase())
    .single()

  if (error || !students) return res.status(401).json({ error: 'Invalid USN or password' })

  // Simple password check (in production use bcrypt)
  if (students.password !== password) return res.status(401).json({ error: 'Invalid USN or password' })

  // Check for existing active session
  const { data: existing } = await supabase
    .from('exam_status')
    .select('*')
    .eq('usn', usn.toUpperCase())
    .eq('status', 'in_progress')
    .single()

  // Update or create exam_status
  if (!existing) {
    await supabase.from('exam_status').upsert({
      usn: students.usn,
      student_name: students.name,
      branch: students.branch,
      status: 'not_started',
      warnings: 0,
      score: 0
    })
  }

  const token = jwt.sign({ usn: students.usn, name: students.name }, process.env.JWT_SECRET, { expiresIn: '4h' })

  res.json({
    student: { usn: students.usn, name: students.name, email: students.email, branch: students.branch },
    token
  })
}
