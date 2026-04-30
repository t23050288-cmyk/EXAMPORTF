import { useState, useEffect } from 'react'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState({ usn: '', name: '', email: '', branch: 'CS', section: 'A', password: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/students')
      const d = await r.json()
      setStudents(Array.isArray(d) ? d : [])
    } catch {}
    setLoading(false)
  }

  const openAdd = () => {
    setEditStudent(null)
    setForm({ usn: '', name: '', email: '', branch: 'CS', section: 'A', password: '' })
    setShowAdd(true)
  }

  const openEdit = (s) => {
    setEditStudent(s.usn)
    setForm({ usn: s.usn, name: s.name, email: s.email || '', branch: s.branch || 'CS', section: s.section || 'A', password: '' })
    setShowAdd(true)
  }

  const saveStudent = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editStudent) {
        await fetch(`/api/admin/students/${editStudent}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      } else {
        await fetch('/api/admin/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      }
      setShowAdd(false)
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
    if (!window.confirm(`Reset exam for ${usn}?`)) return
    await fetch(`/api/admin/students/${usn}/reset`, { method: 'POST' })
    load()
  }

  const branches = ['CS','CSE','ISE','DS','ECE','AI-ML','BBA-2','BCA-2','CY','CD','CB','AIML']
  const sections = ['A','B','C','D','E']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">👥 Students ({students.length})</h2>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#6C63FF' }}>+ Add Student</button>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <form onSubmit={saveStudent} className="bg-gray-800 rounded-2xl p-6 w-96 max-h-screen overflow-y-auto">
            <h3 className="font-bold mb-4">{editStudent ? 'Edit Student' : 'Add New Student'}</h3>

            <label className="text-xs text-gray-400 uppercase">USN</label>
            <input value={form.usn} onChange={e => setForm(p => ({...p, usn: e.target.value.toUpperCase()}))}
              placeholder="e.g. 1RM25CY001" required disabled={!!editStudent}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-3 mt-1 disabled:opacity-50" />

            <label className="text-xs text-gray-400 uppercase">Full Name</label>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              placeholder="Student Full Name" required
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-3 mt-1" />

            <label className="text-xs text-gray-400 uppercase">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
              placeholder="student@example.com"
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-3 mt-1" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 uppercase">Branch</label>
                <select value={form.branch} onChange={e => setForm(p => ({...p, branch: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
                  {branches.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">Section</label>
                <select value={form.section} onChange={e => setForm(p => ({...p, section: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
                  {sections.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="text-xs text-gray-400 uppercase">Password {editStudent && '(leave blank to keep)'}</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))}
              placeholder={editStudent ? 'Leave blank to keep current' : 'Set password'}
              required={!editStudent}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-4 mt-1" />

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-sm text-gray-400">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#6C63FF' }}>
                {saving ? 'Saving...' : editStudent ? 'Update' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">USN</th>
              <th className="text-left px-4 py-3">NAME</th>
              <th className="text-left px-4 py-3">EMAIL</th>
              <th className="text-left px-4 py-3">BRANCH</th>
              <th className="text-left px-4 py-3">SEC</th>
              <th className="text-left px-4 py-3">STATUS</th>
              <th className="text-left px-4 py-3">SCORE</th>
              <th className="text-left px-4 py-3">WARN</th>
              <th className="text-left px-4 py-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="text-center py-10 text-gray-500">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="10" className="text-center py-10 text-gray-500">No students yet. Add one!</td></tr>
            ) : students.map((s, i) => (
              <tr key={s.usn} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-400">{i+1}</td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{s.usn}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-xs">{s.branch}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-300">{s.section || '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: s.status==='submitted'?'#D1FAE5':s.status==='in_progress'?'#FEF3C7':'#374151',
                      color: s.status==='submitted'?'#065F46':s.status==='in_progress'?'#92400E':'#9CA3AF'
                    }}>
                    {s.status==='submitted'?'✓ Done':s.status==='in_progress'?'📝 Live':'⏳ Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-green-400">{s.score ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs"
                    style={{ background: s.warnings>0?'#FEE2E2':'#374151', color: s.warnings>0?'#991B1B':'#9CA3AF' }}>
                    {s.warnings > 0 ? `🔴 ${s.warnings}` : '0'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="px-2 py-1 rounded bg-gray-700 text-xs hover:bg-gray-600">✏️</button>
                    <button onClick={() => resetExam(s.usn)} className="px-2 py-1 rounded bg-blue-900 text-blue-300 text-xs hover:bg-blue-800">🔄</button>
                    <button onClick={() => deleteStudent(s.usn)} className="px-2 py-1 rounded bg-red-900 text-red-300 text-xs hover:bg-red-800">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
