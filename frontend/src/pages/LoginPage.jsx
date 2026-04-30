import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: usn.trim().toUpperCase(), password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('examguard_student', JSON.stringify(data.student))
      localStorage.setItem('examguard_token', data.token)
      navigate('/exam')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="w-full max-w-md p-8 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-white">ExamGuard</h1>
          <p className="text-sm mt-1" style={{ color: '#00C9A7' }}>Secure Online Examination Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* USN */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🎓</span>
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-400 outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="USN (e.g. 1RM25CY000)"
              value={usn}
              onChange={e => setUsn(e.target.value.toUpperCase())}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🔒</span>
            <input
              type="password"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-400 outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="Access Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-3">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all"
            style={{ background: loading ? '#555' : 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
            {loading ? '⏳ Signing In...' : 'Sign In →'}
          </button>
        </form>

        <div className="mt-6 p-3 rounded-lg text-xs text-center" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
          ℹ️ Use your registered USN and the password provided by your admin
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ExamGuard v1.0 — Secured Portal
        </p>
      </div>
    </div>
  )
}
