import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const [{ count: qCount }, { count: sCount }, { count: vCount }, { count: activeCount }] = await Promise.all([
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('violations').select('*', { count: 'exact', head: true }),
    supabase.from('exam_status').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])
  res.json({ total_questions: qCount||0, active_quizzes: activeCount||0, candidates: sCount||0, violations: vCount||0 })
}
