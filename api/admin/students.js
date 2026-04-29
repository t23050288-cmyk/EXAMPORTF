import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data: students } = await supabase.from('students').select('usn,name,email,branch').order('usn')
    const { data: statuses } = await supabase.from('exam_status').select('usn,status,warnings,score')
    const statusMap = {}
    statuses?.forEach(s => statusMap[s.usn] = s)
    const combined = (students||[]).map(s => ({ ...s, status: statusMap[s.usn]?.status||'not_started', warnings: statusMap[s.usn]?.warnings||0, score: statusMap[s.usn]?.score||0 }))
    return res.json(combined)
  }
  if (req.method === 'POST') {
    const { usn, name, email, branch, password } = req.body
    await supabase.from('students').insert({ usn: usn.toUpperCase(), name, email, branch, password })
    await supabase.from('exam_status').insert({ usn: usn.toUpperCase(), student_name: name, branch, status: 'not_started', warnings: 0, score: 0 })
    return res.json({ ok: true })
  }
  res.status(405).end()
}
