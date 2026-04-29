import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResultPage() {
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const r = JSON.parse(localStorage.getItem('examguard_result') || 'null')
    if (!r) navigate('/login')
    else setResult(r)
  }, [])

  const downloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const student = JSON.parse(localStorage.getItem('examguard_student') || '{}')
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.setTextColor(108, 99, 255)
    doc.text('ExamGuard', 105, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text('Examination Result', 105, 30, { align: 'center' })
    doc.setFontSize(11)
    doc.text(`Name: ${student.name}`, 20, 50)
    doc.text(`USN: ${student.usn}`, 20, 60)
    doc.text(`Branch: ${student.branch}`, 20, 70)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 80)
    doc.line(20, 90, 190, 90)
    doc.setFontSize(14)
    doc.text(`Total Score: ${result.score}/${result.total}`, 105, 105, { align: 'center' })
    doc.setFontSize(11)
    doc.text(`Correct: ${result.correct}`, 60, 120)
    doc.text(`Wrong: ${result.wrong}`, 105, 120)
    doc.text(`Skipped: ${result.skipped}`, 150, 120)
    doc.text(`Percentage: ${((result.score/result.total)*100).toFixed(1)}%`, 105, 135, { align: 'center' })
    doc.setFontSize(9)
    doc.setTextColor(150)
    doc.text('This is a computer-generated result. ExamGuard v1.0', 105, 280, { align: 'center' })
    doc.save(`${student.usn}_result.pdf`)
  }

  if (!result) return null

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <div className="text-center p-10 rounded-3xl max-w-md w-full mx-4"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <h1 className="text-5xl font-black text-white mb-6">THANK YOU!</h1>
        <div className="flex items-center justify-center gap-3 mb-6 text-sm text-gray-300">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
            ✅ Exam Submitted
          </span>
          <span>Answered: {result.correct + result.wrong}/{result.total}</span>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-3xl font-bold text-green-400">{result.correct}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Correct</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{result.wrong}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Wrong</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-400">{result.skipped}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Skipped</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-center">
            <span className="text-gray-400 text-sm">Total Score</span>
            <span className="text-2xl font-bold text-white">{result.score}/{result.total}</span>
          </div>
        </div>

        <button onClick={downloadPDF}
          className="w-full py-3 rounded-xl font-semibold text-white mb-3"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
          📄 Download Result PDF
        </button>
        <button onClick={() => { localStorage.clear(); navigate('/login') }}
          className="w-full py-3 rounded-xl font-semibold text-gray-400 border border-white/20">
          Logout
        </button>
      </div>
    </div>
  )
}
