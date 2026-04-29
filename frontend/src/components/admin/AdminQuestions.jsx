import { useState, useEffect } from 'react'

export default function AdminQuestions() {
  const [folders, setFolders] = useState([])
  const [expanded, setExpanded] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ question_text:'', option_a:'', option_b:'', option_c:'', option_d:'', correct_answer:'A', marks:1, order_index:1, exam_identity:'', branch:'DS' })
  const [saving, setSaving] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const r = await fetch('/api/admin/questions')
      const d = await r.json()
      setFolders(d.folders || [])
      setTotal(d.total || 0)
    } catch {}
  }

  const saveQuestion = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setShowAdd(false)
      load()
    } catch {}
    setSaving(false)
  }

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete question?')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">📋 Questions ({total})</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#6C63FF' }}>
          + Add Question
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 overflow-y-auto">
          <form onSubmit={saveQuestion} className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg m-4">
            <h3 className="font-bold mb-4">Add Question</h3>
            <label className="text-xs text-gray-400 uppercase">Question Text</label>
            <textarea value={form.question_text} onChange={e => setForm(p=>({...p,question_text:e.target.value}))}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-3 mt-1" rows={3} required />
            <label className="text-xs text-gray-400 uppercase">Options</label>
            {['a','b','c','d'].map(o => (
              <input key={o} value={form[`option_${o}`]} onChange={e => setForm(p=>({...p,[`option_${o}`]:e.target.value}))}
                placeholder={`Option ${o.toUpperCase()}`} required
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-2 mt-1" />
            ))}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div>
                <label className="text-xs text-gray-400">Correct</label>
                <select value={form.correct_answer} onChange={e => setForm(p=>({...p,correct_answer:e.target.value}))}
                  className="w-full mt-1 px-2 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
                  {['A','B','C','D'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Marks</label>
                <input type="number" value={form.marks} onChange={e => setForm(p=>({...p,marks:+e.target.value}))}
                  className="w-full mt-1 px-2 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Order</label>
                <input type="number" value={form.order_index} onChange={e => setForm(p=>({...p,order_index:+e.target.value}))}
                  className="w-full mt-1 px-2 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Branch</label>
                <input value={form.branch} onChange={e => setForm(p=>({...p,branch:e.target.value}))}
                  className="w-full mt-1 px-2 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-400">Exam Identity (Folder)</label>
              <input value={form.exam_identity} onChange={e => setForm(p=>({...p,exam_identity:e.target.value}))}
                placeholder="e.g. IP NEXUS DS"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-sm text-gray-400">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: '#6C63FF' }}>
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {folders.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center text-gray-500">
            <p className="text-2xl mb-3">📂</p>
            <p>No questions yet. Add your first question!</p>
          </div>
        ) : folders.map((folder, fi) => (
          <div key={fi} className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(e => ({...e, [folder.name]: !e[folder.name]}))}>
              <div>
                <p className="font-semibold">{folder.name} <span className="text-xs text-gray-400">({folder.branch})</span></p>
                <p className="text-xs text-gray-400 mt-1">{folder.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{folder.difficulty || 'Easy'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">📋 {folder.questions?.length || 0} questions</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600">Rename</button>
                <button className="px-3 py-1 rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600">Edit Branch</button>
                <button className="px-3 py-1 rounded bg-red-900 text-xs text-red-300 hover:bg-red-800">Delete Folder</button>
              </div>
            </div>
            {expanded[folder.name] && (
              <div className="border-t border-gray-700 p-4">
                <div className="grid grid-cols-4 gap-3">
                  {(folder.questions || []).map((q, qi) => (
                    <div key={qi} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-400 font-bold">Q{q.order_index || qi+1}</span>
                        <div className="flex gap-1">
                          <button className="text-xs text-blue-400 hover:text-blue-300">✏️</button>
                          <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-400 hover:text-red-300">🗑️</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3">{q.question_text}</p>
                      <div className="flex gap-1 mt-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600 text-gray-300">{q.branch}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600 text-gray-300">{q.marks} Mark{q.marks>1?'s':''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
