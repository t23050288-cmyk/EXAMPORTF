import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try { jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Unauthorized' }) }

  const { usn, question_id, answer } = req.body
  await supabase.from('exam_status').update({ status: 'in_progress' }).eq('usn', usn)
  await supabase.from('student_answers').upsert({ usn, question_id, answer }, { onConflict: 'usn,question_id' })
  res.json({ ok: true })
}
