import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    jwt.verify(token, process.env.JWT_SECRET)
  } catch { return res.status(401).json({ error: 'Invalid token' }) }

  const { data: config } = await supabase.from('exam_config').select('*').single()
  const { data: questions } = await supabase
    .from('questions')
    .select('id,question_text,option_a,option_b,option_c,option_d,marks,image_url,order_index,exam_identity')
    .order('order_index', { ascending: true })

  if (!config || !questions) return res.status(500).json({ error: 'Exam not configured' })

  let q = questions
  if (config.shuffle_questions) q = q.sort(() => Math.random() - 0.5)

  res.json({ questions: q, config })
}
