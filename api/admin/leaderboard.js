import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { branch } = req.query
  let query = supabase.from('exam_status').select('usn, student_name, branch, score, correct, total_questions, submitted_at, started_at').eq('status', 'submitted')
  if (branch && branch !== 'All Branches') query = query.eq('branch', branch)
  const { data } = await query.order('score', { ascending: false })

  const entries = (data||[]).map(s => {
    let time_taken = '-'
    if (s.started_at && s.submitted_at) {
      const ms = new Date(s.submitted_at) - new Date(s.started_at)
      const mins = Math.floor(ms/60000), secs = Math.floor((ms%60000)/1000)
      time_taken = `${mins}m ${secs}s`
    }
    return { usn: s.usn, name: s.student_name, branch: s.branch, score: s.score||0, total: s.total_questions||39, time_taken }
  })
  res.json(entries)
}
