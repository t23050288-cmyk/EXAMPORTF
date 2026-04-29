import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ExamPage() {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState(null) // null | 1 | 2
  const [violations, setViolations] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const student = JSON.parse(localStorage.getItem('examguard_student') || '{}')
  const token = localStorage.getItem('examguard_token')
  const timerRef = useRef(null)
  const violationsRef = useRef(0)

  useEffect(() => {
    loadExam()
  }, [])

  const loadExam = async () => {
    try {
      const res = await fetch('/api/get-exam', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setQuestions(data.questions)
      setConfig(data.config)
      setTimeLeft(data.config.duration_minutes * 60)
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Timer
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft])

  // Anti-cheat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) triggerViolation('Tab switched')
    }
    const handleBlur = () => triggerViolation('Window minimized/blurred')
    const preventContext = (e) => e.preventDefault()
    const preventCopy = (e) => e.preventDefault()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('contextmenu', preventContext)
    document.addEventListener('copy', preventCopy)
    document.addEventListener('cut', preventCopy)

    // Enter fullscreen
    document.documentElement.requestFullscreen?.().catch(() => {})

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('contextmenu', preventContext)
      document.removeEventListener('copy', preventCopy)
      document.removeEventListener('cut', preventCopy)
    }
  }, [])

  const triggerViolation = useCallback(async (type) => {
    const newCount = violationsRef.current + 1
    violationsRef.current = newCount
    setViolations(newCount)

    // Log to backend
    await fetch('/api/log-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ usn: student.usn, type, count: newCount })
    }).catch(() => {})

    if (newCount >= 3) {
      handleSubmit(true)
    } else {
      setWarning(newCount)
    }
  }, [token, student.usn])

  const reenterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setWarning(null)
  }

  const handleAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }))
    // Auto-save
    fetch('/api/save-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ usn: student.usn, question_id: questionId, answer: option })
    }).catch(() => {})
  }

  const handleSubmit = async (auto = false) => {
    if (submitting) return
    setSubmitting(true)
    clearTimeout(timerRef.current)
    try {
      const res = await fetch('/api/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ usn: student.usn, answers })
      })
      const data = await res.json()
      localStorage.setItem('examguard_result', JSON.stringify(data.result))
      document.exitFullscreen?.().catch(() => {})
      navigate('/result')
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const getQuestionStatus = (idx) => {
    const q = questions[idx]
    if (!q) return 'notvisited'
    if (idx === current) return 'current'
    if (answers[q.id]) return 'answered'
    if (flagged[q.id]) return 'flagged'
    return 'notvisited'
  }

  const statusColor = { current: '#6C63FF', answered: '#00C9A7', flagged: '#F59E0B', notvisited: '#374151' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">Loading exam...</p>
      </div>
    </div>
  )

  const q = questions[current]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Warning Modal */}
      {warning && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
            style={{ border: `2px solid ${warning === 1 ? '#F59E0B' : '#EF4444'}` }}>
            <div className="text-5xl mb-3">{warning === 1 ? '⚠️' : '🚨'}</div>
            <div className="flex justify-center gap-2 mb-4">
              {[1,2,3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: i <= warning ? (warning===1?'#F59E0B':'#EF4444') : '#E5E7EB' }} />
              ))}
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: warning === 1 ? '#92400E' : '#991B1B' }}>
              {warning === 1 ? 'Warning 1 of 3' : 'Final Warning — 2 of 3'}
            </h2>
            <p className="text-gray-600 mb-2">
              {warning === 1 ? '⚠️ Warning 1: Please return to the exam and stay focused.' : '🚨 Final warning! One more violation and your exam will be auto-submitted.'}
            </p>
            <p className="text-sm text-gray-500 bg-gray-100 rounded-lg p-2 mb-4">
              {warning === 1 ? 'Switching tabs, minimizing, or exiting fullscreen is not allowed.' : 'Your exam will be auto-submitted on the next violation.'}
            </p>
            <button onClick={reenterFullscreen}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: warning === 1 ? '#3B82F6' : '#EF4444' }}>
              {warning === 1 ? 'Re-enter Fullscreen & Return' : 'I Understand — Re-enter Fullscreen'}
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Welcome, {student.name}!</span> Deep breaths and stay focused. You've got this.
        </p>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: '#6C63FF' }}>
          {student.name?.[0]?.toUpperCase() || 'S'}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex gap-6">
        {/* Main exam area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* Exam header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{config?.title || 'EXAM'}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">TIME REMAINING:</span>
                <span className="text-2xl font-bold" style={{ color: timeLeft < 300 ? '#EF4444' : '#1F2937' }}>
                  {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full mb-6">
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%`, background: 'linear-gradient(90deg, #6C63FF, #00C9A7)' }} />
            </div>

            {q && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Question {current + 1} of {questions.length}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">{q.marks} mark</span>
                </div>
                <p className="text-gray-800 font-medium mb-6 text-base leading-relaxed">{q.question_text}</p>
                {q.image_url && <img src={q.image_url} alt="question" className="mb-4 max-w-sm rounded-lg" />}
                <div className="space-y-3">
                  {['A','B','C','D'].map((opt, i) => {
                    const optText = q[`option_${opt.toLowerCase()}`]
                    if (!optText) return null
                    const selected = answers[q.id] === opt
                    return (
                      <button key={opt} onClick={() => handleAnswer(q.id, opt)}
                        className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3"
                        style={{ borderColor: selected ? '#6C63FF' : '#E5E7EB', background: selected ? '#EEF2FF' : 'white' }}>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: selected ? '#6C63FF' : '#D1D5DB' }}>
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                        </div>
                        <span className="text-gray-700">{opt}. {optText}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button onClick={() => setCurrent(c => Math.max(0, c-1))}
                    disabled={current === 0}
                    className="px-4 py-2 rounded-lg border text-sm text-gray-600 disabled:opacity-30">
                    Previous
                  </button>
                  <button onClick={() => setFlagged(f => ({ ...f, [q.id]: !f[q.id] }))}
                    className="px-4 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#F59E0B', color: '#92400E', background: flagged[q.id] ? '#FEF3C7' : 'white' }}>
                    {flagged[q.id] ? '🚩 Flagged' : 'Mark for Review'}
                  </button>
                  {current < questions.length - 1 ? (
                    <button onClick={() => setCurrent(c => c+1)}
                      className="px-6 py-2 rounded-lg text-sm text-white font-semibold"
                      style={{ background: 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
                      Save & Next
                    </button>
                  ) : (
                    <button onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className="px-6 py-2 rounded-lg text-sm text-white font-semibold"
                      style={{ background: '#EF4444' }}>
                      {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Progress grid */}
        <div className="w-64">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4">Progress</h3>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {questions.map((_, idx) => {
                const status = getQuestionStatus(idx)
                return (
                  <button key={idx} onClick={() => setCurrent(idx)}
                    className="w-8 h-8 rounded text-xs font-medium transition-all"
                    style={{ background: statusColor[status], color: status === 'notvisited' ? '#9CA3AF' : 'white' }}>
                    {idx+1}
                  </button>
                )
              })}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#6C63FF'}} /><span>Current</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#00C9A7'}} /><span>Answered</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#F59E0B'}} /><span>Flagged</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#374151'}} /><span>Not Visited</span></div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">Answered: <b>{Object.keys(answers).length}</b>/{questions.length}</p>
              {violations > 0 && <p className="text-xs text-red-500 mt-1">⚠️ Warnings: {violations}/3</p>}
            </div>
            <button onClick={() => { if(window.confirm('Are you sure you want to submit?')) handleSubmit(false) }}
              disabled={submitting}
              className="w-full mt-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ background: '#EF4444' }}>
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
