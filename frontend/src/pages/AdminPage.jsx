import { useState, useEffect } from 'react'
import AdminMonitor from '../components/admin/AdminMonitor'
import AdminLeaderboard from '../components/admin/AdminLeaderboard'
import AdminQuestions from '../components/admin/AdminQuestions'
import AdminStudents from '../components/admin/AdminStudents'
import AdminHarvester from '../components/admin/AdminHarvester'
import AdminControl from '../components/admin/AdminControl'

const ADMIN_PASSWORD = 'admin123'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState('control')
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed')) setAuthed(true)
  }, [])

  const login = (e) => {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', '1')
      setAuthed(true)
    } else {
      setError('Invalid password')
    }
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={login} className="bg-gray-800 p-8 rounded-2xl w-80">
        <h2 className="text-white text-xl font-bold mb-6 text-center">Admin Access</h2>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white mb-4 outline-none" placeholder="Admin Password" />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold"
          style={{ background: '#6C63FF' }}>Enter</button>
      </form>
    </div>
  )

  const tabs = [
    { id: 'monitor', label: '📡 Monitor' },
    { id: 'leaderboard', label: '⚡ Leaderboard' },
    { id: 'questions', label: '📋 Questions' },
    { id: 'students', label: '👥 Students' },
    { id: 'harvester', label: '🌾 Harvester' },
    { id: 'control', label: '🎛️ Control' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Nav */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: '#6C63FF' }}>⚙️</div>
          <div>
            <p className="font-bold text-sm">EXAM Admin</p>
            <p className="text-xs text-gray-400">Live Exam Monitor · Updated 0s ago</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: tab === t.id ? '#6C63FF' : 'transparent', color: tab === t.id ? 'white' : '#9CA3AF' }}>
              {t.label}
            </button>
          ))}
          <button onClick={() => { sessionStorage.clear(); setAuthed(false) }}
            className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-gray-600 ml-2">
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'monitor' && <AdminMonitor />}
        {tab === 'leaderboard' && <AdminLeaderboard />}
        {tab === 'questions' && <AdminQuestions />}
        {tab === 'students' && <AdminStudents />}
        {tab === 'harvester' && <AdminHarvester />}
        {tab === 'control' && <AdminControl />}
      </div>
    </div>
  )
}
