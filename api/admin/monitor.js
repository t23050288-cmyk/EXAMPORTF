import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const [{ data: inProgress }, { data: violations }, { count: completed }] = await Promise.all([
    supabase.from('exam_status').select('usn').eq('status', 'in_progress'),
    supabase.from('violations').select('*').order('id', { ascending: false }).limit(50),
    supabase.from('exam_status').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
  ])
  const { count: totalViolations } = await supabase.from('violations').select('*', { count: 'exact', head: true })
  res.json({
    stats: { active: inProgress?.length||0, violations: totalViolations||0, completed: completed||0 },
    violations: violations || []
  })
}
