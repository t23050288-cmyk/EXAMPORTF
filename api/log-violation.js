import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try { jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Unauthorized' }) }

  const { usn, type, count } = req.body
  const { data: student } = await supabase.from('students').select('name').eq('usn', usn).single()
  await supabase.from('violations').insert({ usn, student_name: student?.name || usn, type, recorded_at: new Date().toISOString() })
  await supabase.from('exam_status').update({ warnings: count }).eq('usn', usn)
  res.json({ ok: true })
}
