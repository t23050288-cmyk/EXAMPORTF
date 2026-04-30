import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { method, query } = req
  const urlParts = req.url?.split('/').filter(Boolean) // e.g. ['api','admin','students','1RM25CY001','reset']
  const usnParam = urlParts?.[3]
  const action = urlParts?.[4] // 'reset' if present

  // GET /api/admin/students - list all
  if (method === 'GET' && !usnParam) {
    const { data: students } = await supabase.from('students').select('usn,name,email,branch,section').order('created_at')
    const { data: statuses } = await supabase.from('exam_status').select('usn,status,score,warnings')
    const statusMap = {}
    statuses?.forEach(s => { statusMap[s.usn] = s })
    const merged = (students || []).map(s => ({
      ...s,
      status: statusMap[s.usn]?.status || 'not_started',
      score: statusMap[s.usn]?.score || 0,
      warnings: statusMap[s.usn]?.warnings || 0
    }))
    return res.json(merged)
  }

  // POST /api/admin/students - add student
  if (method === 'POST' && !usnParam) {
    const { usn, name, email, branch, section, password } = req.body
    if (!usn || !name || !password) return res.status(400).json({ error: 'USN, name, password required' })
    const { error } = await supabase.from('students').insert({ usn: usn.toUpperCase(), name, email, branch, section, password })
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true })
  }

  // PUT /api/admin/students/:usn - edit student
  if (method === 'PUT' && usnParam && !action) {
    const { name, email, branch, section, password } = req.body
    const updates = { name, email, branch, section }
    if (password && password.trim() !== '') updates.password = password
    const { error } = await supabase.from('students').update(updates).eq('usn', usnParam)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true })
  }

  // DELETE /api/admin/students/:usn - delete student
  if (method === 'DELETE' && usnParam && !action) {
    await supabase.from('exam_status').delete().eq('usn', usnParam)
    await supabase.from('student_answers').delete().eq('usn', usnParam)
    await supabase.from('violations').delete().eq('usn', usnParam)
    await supabase.from('students').delete().eq('usn', usnParam)
    return res.json({ ok: true })
  }

  // POST /api/admin/students/:usn/reset - reset exam
  if (method === 'POST' && usnParam && action === 'reset') {
    await supabase.from('student_answers').delete().eq('usn', usnParam)
    await supabase.from('violations').delete().eq('usn', usnParam)
    await supabase.from('exam_status').update({
      status: 'not_started', score: 0, correct: 0, wrong: 0,
      skipped: 0, warnings: 0, started_at: null, submitted_at: null
    }).eq('usn', usnParam)
    return res.json({ ok: true })
  }

  res.status(405).end()
}
