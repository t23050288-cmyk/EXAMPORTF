import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data: questions, count } = await supabase.from('questions').select('*', { count: 'exact' }).order('exam_identity').order('order_index')
    const folderMap = {}
    questions?.forEach(q => {
      const key = q.exam_identity || 'General'
      if (!folderMap[key]) folderMap[key] = { name: key, branch: q.branch, difficulty: 'Easy', description: `Assessment covering key topics in ${key}.`, questions: [] }
      folderMap[key].questions.push(q)
    })
    return res.json({ folders: Object.values(folderMap), total: count||0 })
  }
  if (req.method === 'POST') {
    await supabase.from('questions').insert(req.body)
    return res.json({ ok: true })
  }
  res.status(405).end()
}
