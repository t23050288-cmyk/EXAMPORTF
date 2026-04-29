import { useState, useEffect } from 'react'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ usn: '', name: '', email: '', branch: 'CS', password: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/students')
      const d = await r.json()
      setStudents(d)
    } catch {}
    setLoading(false)
  }

  const addStudent = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setShowAdd(false)
      setForm({ usn: '', name: '', email: '', branch: 'CS', password: '' })
      load()
    } catch {}
    setSaving(false)
  }

  const deleteStudent = async (usn) => {
    if (!window.confirm(`Delete student ${usn}?`)) return
    await fetch(`/api/admin/students/${usn}`, { method: 'DELETE' })
    load()
  }

  const resetExam = async (usn) => {
    await fetch(`/api/admin/students/${usn}/reset`, { method: 'POST' })
    load()
  }

  const branches = ['CS','CSE','ISE','DS','ECE','AI-ML','BBA-2','BCA-2']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">👥 Students ({students.length})</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#6C63FF' }}>+ Add Student</button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <form onSubmit={addStudent} className="bg-gray-800 rounded-2xl p-6 w-96">
            <h3 className="font-bold mb-4">Add New Student</h3>
            {['usn','name','email','password'].map(f => (
              <input key={f} value={form[f]} onChange={e => setForm(p => ({...p,[f]:e.target.value}))}
                placeholder={f.toUpperCase()} required
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-3" />
            ))}
            <select value={form.branch} onChange={e => setForm(p => ({...p,branch:e.target.value}))}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-4">
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-sm text-gray-400">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#6C63FF' }}>
                {saving ? 'Saving...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">USN</th>
              <th className="text-left px-4 py-3">NAME</th>
              <th className="text-left px-4 py-3">EMAIL</th>
              <th className="text-left px-4 py-3">BRANCH</th>
              <th className="text-left px-4 py-3">STATUS</th>
              <th className="text-left px-4 py-3">WARNINGS</th>
              <th className="text-left px-4 py-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-10 text-gray-500">Loading...</td></tr>
            ) : students.map((s, i) => (
              <tr key={s.usn} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-400">{i+1}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.usn}</td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-xs">{s.branch}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs"
                    style={{ background: s.status==='submitted'?'#D1FAE5':s.status==='in_progress'?'#FEF3C7':'#F3F4F6',
                             color: s.status==='submitted'?'#065F46':s.status==='in_progress'?'#92400E':'#374151' }}>
                    {s.status==='submitted'?'✓ Submitted':s.status==='in_progress'?'📝 In Progress':'⏳ Not Started'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs" style={{ background: s.warnings>0?'#FEE2E2':'#F3F4F6', color: s.warnings>0?'#991B1B':'#374151' }}>
                    {s.warnings > 0 ? `🔴 ${s.warnings}` : '0'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <button className="px-2 py-1 rounded bg-gray-700 text-xs hover:bg-gray-600">Edit</button>
                  <button onClick={() => resetExam(s.usn)} className="px-2 py-1 rounded bg-blue-900 text-blue-300 text-xs hover:bg-blue-800">Re-Exam</button>
                  <button onClick={() => deleteStudent(s.usn)} className="px-2 py-1 rounded bg-red-900 text-red-300 text-xs hover:bg-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
