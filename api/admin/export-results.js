import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { data } = await supabase.from('exam_status').select('usn,student_name,branch,status,score,correct,wrong,skipped,warnings,submitted_at').eq('status','submitted').order('score',{ascending:false})
  const csv = ['USN,Name,Branch,Score,Correct,Wrong,Skipped,Warnings,Submitted At',
    ...(data||[]).map(r => `${r.usn},${r.student_name},${r.branch},${r.score},${r.correct},${r.wrong},${r.skipped},${r.warnings},${r.submitted_at}`)
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=results.csv')
  res.send(csv)
}
