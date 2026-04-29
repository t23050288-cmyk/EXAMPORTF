import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data } = await supabase.from('exam_config').select('*').single()
    return res.json(data || {})
  }
  if (req.method === 'POST') {
    const { data: existing } = await supabase.from('exam_config').select('id').single()
    if (existing) {
      await supabase.from('exam_config').update(req.body).eq('id', existing.id)
    } else {
      await supabase.from('exam_config').insert(req.body)
    }
    return res.json({ ok: true })
  }
  res.status(405).end()
}
