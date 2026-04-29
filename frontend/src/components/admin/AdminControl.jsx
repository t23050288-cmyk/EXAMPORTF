import { useState, useEffect } from 'react'

export default function AdminControl() {
  const [stats, setStats] = useState({ total_questions: 0, active_quizzes: 0, candidates: 0, violations: 0 })
  const [config, setConfig] = useState({ title: '', duration_minutes: 30, is_active: false, marks_per_question: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadStats(); loadConfig() }, [])

  const loadStats = async () => {
    try {
      const r = await fetch('/api/admin/stats')
      const d = await r.json()
      setStats(d)
    } catch {}
  }

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/admin/config')
      const d = await r.json()
      if (d.title) setConfig(d)
    } catch {}
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      setMsg('Saved!')
      setTimeout(() => setMsg(''), 2000)
    } catch {}
    setSaving(false)
  }

  const statCards = [
    { label: 'TOTAL QUESTIONS', value: stats.total_questions, sub: 'Questions in bank', icon: '📋', color: '#6C63FF' },
    { label: 'ACTIVE QUIZZES', value: stats.active_quizzes, sub: 'Live: ExamGuard Assessment', icon: '🔴', color: '#10B981' },
    { label: 'CANDIDATES REGISTERED', value: stats.candidates, sub: 'Total registered', icon: '👥', color: '#3B82F6' },
    { label: 'VIOLATIONS', value: stats.violations, sub: 'Total alerts', icon: '⚠️', color: '#EF4444' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm">Manage questions, configure quizzes, and monitor activity</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6C63FF' }}>🏠 Dashboard</button>
          <button onClick={loadConfig} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-600">⚙️ Quiz Settings</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
            </div>
            <span className="text-2xl">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Question Management */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">📋 Question Management</h3>
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase">Target Quiz</label>
            <select className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
              <option>{config.title || 'IP NEXUS DS'}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href="/admin" className="bg-gray-700 rounded-lg p-3 text-center hover:bg-gray-600 cursor-pointer">
              <div className="text-xl mb-1">➕</div>
              <p className="text-xs text-gray-300">Add Question</p>
            </a>
            <a href="/admin" className="bg-gray-700 rounded-lg p-3 text-center hover:bg-gray-600 cursor-pointer">
              <div className="text-xl mb-1">📊</div>
              <p className="text-xs text-gray-300">Upload CSV/Excel</p>
            </a>
          </div>
        </div>

        {/* Quiz Controls */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">⚙️ Quiz Controls</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-sm" style={{ color: config.is_active ? '#10B981' : '#9CA3AF' }}>
                {config.is_active ? '🟢 Active' : '⚫ Inactive'}
              </p>
              <p className="text-xs text-gray-400">{config.is_active ? 'Students can attempt this exam.' : 'Exam is currently off.'}</p>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, is_active: !c.is_active }))}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: config.is_active ? '#10B981' : '#374151' }}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                style={{ left: config.is_active ? '26px' : '2px' }} />
            </button>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-400">Exam Title</label>
            <input value={config.title} onChange={e => setConfig(c => ({...c, title: e.target.value}))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400">Duration (mins)</label>
              <input type="number" value={config.duration_minutes} onChange={e => setConfig(c => ({...c, duration_minutes: +e.target.value}))}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Marks/Question</label>
              <input type="number" value={config.marks_per_question} onChange={e => setConfig(c => ({...c, marks_per_question: +e.target.value}))}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setConfig(c => ({...c, shuffle_questions: !c.shuffle_questions}))}
              className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: config.shuffle_questions ? '#6C63FF' : '#374151', color: config.shuffle_questions ? '#6C63FF' : '#9CA3AF', background: config.shuffle_questions ? '#1E1B4B' : 'transparent' }}>
              🔀 Shuffle Questions
            </button>
            <button onClick={() => setConfig(c => ({...c, shuffle_options: !c.shuffle_options}))}
              className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: config.shuffle_options ? '#6C63FF' : '#374151', color: config.shuffle_options ? '#6C63FF' : '#9CA3AF', background: config.shuffle_options ? '#1E1B4B' : 'transparent' }}>
              🔀 Shuffle Options
            </button>
          </div>
          <button onClick={saveConfig} disabled={saving}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#6C63FF' }}>
            {saving ? 'Saving...' : msg || 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
