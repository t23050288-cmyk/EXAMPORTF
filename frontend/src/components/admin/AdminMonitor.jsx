import { useState, useEffect } from 'react'

export default function AdminMonitor() {
  const [stats, setStats] = useState({ active: 0, violations: 0, completed: 0 })
  const [violations, setViolations] = useState([])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const load = async () => {
    try {
      const r = await fetch('/api/admin/monitor')
      const d = await r.json()
      setStats(d.stats)
      setViolations(d.violations || [])
    } catch {}
  }

  const exportResults = async () => {
    const r = await fetch('/api/admin/export-results')
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">📡 Live Monitor</h2>
        <button onClick={exportResults} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6C63FF' }}>
          📊 Export Results
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-5 flex items-center gap-4">
          <span className="text-3xl">👥</span>
          <div>
            <p className="text-3xl font-black text-white">{stats.active}</p>
            <p className="text-xs text-gray-400">Active Students</p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 flex items-center gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="text-3xl font-black text-yellow-400">{stats.violations}</p>
            <p className="text-xs text-gray-400">Total Violations</p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 flex items-center gap-4">
          <span className="text-3xl">✅</span>
          <div>
            <p className="text-3xl font-black text-green-400">{stats.completed}</p>
            <p className="text-xs text-gray-400">Completed Quizzes</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">⚠️ Violation Alerts</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-red-900 text-red-300">{stats.violations} events</span>
        </div>
        {violations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No violations recorded yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {violations.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <div>
                    <p className="font-medium text-sm">{v.student_name} <span className="text-gray-400 text-xs">{v.usn}</span></p>
                    <p className="text-xs text-red-400">{v.type}</p>
                    <p className="text-xs text-gray-500">Recorded during active session</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">#{v.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
