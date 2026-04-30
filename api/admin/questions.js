import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { method } = req
  const urlParts = req.url?.split('/').filter(Boolean)
  const questionId = urlParts?.[3] // /api/admin/questions/:id

  // GET - list all grouped by folder
  if (method === 'GET' && !questionId) {
    const { data: questions, count } = await supabase
      .from('questions').select('*', { count: 'exact' })
      .order('exam_identity').order('order_index')
    const folderMap = {}
    questions?.forEach(q => {
      const key = q.exam_identity || 'General'
      if (!folderMap[key]) folderMap[key] = { name: key, branch: q.branch, description: `Questions for ${key}`, questions: [] }
      folderMap[key].questions.push(q)
    })
    return res.json({ folders: Object.values(folderMap), total: count || 0 })
  }

  // POST - add question
  if (method === 'POST' && !questionId) {
    const { error } = await supabase.from('questions').insert(req.body)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true })
  }

  // DELETE - delete question by id
  if (method === 'DELETE' && questionId) {
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
