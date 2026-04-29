import { useState, useEffect } from 'react'

export default function AdminLeaderboard() {
  const [entries, setEntries] = useState([])
  const [branch, setBranch] = useState('All Branches')
  const branches = ['All Branches','CS','CSE','DS','ISE','ECE','AI-ML','BBA-2','BCA-2']

  useEffect(() => { load() }, [branch])

  const load = async () => {
    try {
      const r = await fetch(`/api/admin/leaderboard?branch=${encodeURIComponent(branch)}`)
      const d = await r.json()
      setEntries(d)
    } catch {}
  }

  const medal = ['🥇','🥈','🥉']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-yellow-400">⚡ Quantum Leaderboard</h2>
          <p className="text-gray-400 text-sm">Ranked by Accuracy × Velocity · {entries.length} matches</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={branch} onChange={e => setBranch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
            {branches.map(b => <option key={b}>{b}</option>)}
          </select>
          <span className="text-xs px-3 py-1 rounded-full bg-green-900 text-green-300">🔴 LIVE</span>
        </div>
      </div>

      {/* Top 3 */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            if (!e) return <div key={i} />
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3
            const colors = ['#C0C0C0','#FFD700','#CD7F32']
            return (
              <div key={i} className="rounded-2xl p-5 text-center"
                style={{ background: `${colors[i]}22`, border: `2px solid ${colors[i]}44`, marginTop: rank===1?0:rank===2?16:8 }}>
                <div className="text-3xl mb-2">{medal[rank-1]}</div>
                <p className="text-xs text-gray-400 uppercase">{e.branch}</p>
                <p className="font-bold text-white">{e.name}</p>
                <p className="text-xs text-gray-400">{e.usn}</p>
                <p className="text-2xl font-black mt-2" style={{ color: colors[i] }}>
                  {((e.score / e.total) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">{e.score}/{e.total} marks · ⏱ {e.time_taken}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {entries.slice(3).map((e, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-gray-400 font-bold w-6">{i+4}</span>
              <div>
                <p className="font-semibold">{e.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{e.usn}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-700">{e.branch}</span>
                  <span className="text-xs text-gray-400">⏱ {e.time_taken}</span>
                </div>
              </div>
            </div>
            <p className="font-bold" style={{ color: e.score/e.total >= 0.7 ? '#10B981' : '#F59E0B' }}>
              {((e.score/e.total)*100).toFixed(1)}%
              <span className="text-xs text-gray-400 ml-2">{e.score}/{e.total} marks</span>
            </p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-gray-500 text-center py-12">No submissions yet</p>}
      </div>
    </div>
  )
}
