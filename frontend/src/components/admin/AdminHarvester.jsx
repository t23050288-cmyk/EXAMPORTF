import { useState } from 'react'

export default function AdminHarvester() {
  const [examIdentity, setExamIdentity] = useState('')
  const [branch, setBranch] = useState('General')
  const [count, setCount] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  const branches = ['General','CS','CSE','ISE','DS','ECE','AI-ML','CY','CD','CB','AIML','BCA-2','BBA-2']

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return
    if (!examIdentity.trim()) { setMsg({ ok: false, text: 'Please enter an Exam Identity name' }); return }
    setUploading(true)
    setMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', examIdentity.trim())
    fd.append('branch', branch)
    fd.append('count', count)
    try {
      const r = await fetch('/api/admin/harvest', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      setMsg({ ok: true, text: `✅ Imported ${d.imported} questions into "${d.folder}" successfully!` })
      setFile(null)
      setExamIdentity('')
      setCount('')
    } catch(err) {
      setMsg({ ok: false, text: `❌ ${err.message}` })
    }
    setUploading(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">🌾 Question Harvester</h2>
          <p className="text-gray-400 text-sm mt-1">Bulk import questions from CSV file</p>
        </div>
        <button onClick={() => setShowGuide(!showGuide)}
          className="px-3 py-1.5 rounded-lg text-xs border border-gray-600 text-gray-400 hover:border-purple-500">
          📋 CSV Format Guide
        </button>
      </div>

      {/* CSV Format Guide */}
      {showGuide && (
        <div className="mb-6 bg-gray-800 rounded-xl p-5 border border-purple-500/30">
          <h3 className="font-semibold text-purple-300 mb-3">📋 Required CSV Format</h3>
          <p className="text-xs text-gray-400 mb-2">Your CSV file must have these columns (header row required):</p>
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto mb-3">
            question,option_a,option_b,option_c,option_d,correct_answer,marks,order_index,branch
          </div>
          <p className="text-xs text-gray-400 mb-2">Example row:</p>
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-yellow-300 overflow-x-auto mb-3">
            What is 2+2?,1,2,3,4,D,1,1,CS
          </div>
          <p className="text-xs text-gray-500">• <b>correct_answer</b>: A, B, C or D</p>
          <p className="text-xs text-gray-500">• <b>marks</b>: integer (default 1)</p>
          <p className="text-xs text-gray-500">• Only CSV supported. Convert Excel → Save As CSV first.</p>
        </div>
      )}

      <div className="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6">
        <form onSubmit={upload}>
          {/* Exam Identity */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Exam Identity / Folder Name *</label>
            <input value={examIdentity} onChange={e => setExamIdentity(e.target.value)}
              placeholder="e.g. IP NEXUS DS, Data Structures Unit 2"
              required
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
          </div>

          {/* Branch */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none">
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          {/* Count */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Question Count (Optional)</label>
            <input type="number" min="1" value={count} onChange={e => setCount(e.target.value)}
              placeholder="Leave blank to import all questions"
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
            <p className="text-xs text-gray-500 mt-1">If set, randomly picks N questions from your file.</p>
          </div>

          {/* File Drop */}
          <div className="mb-4">
            <div
              onClick={() => document.getElementById('harvest-file').click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: file ? '#00C9A7' : '#4B5563' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}>
              <div className="text-4xl mb-3">{file ? '✅' : '📂'}</div>
              {file ? (
                <div>
                  <p className="text-green-400 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size/1024).toFixed(1)} KB</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-xs text-red-400 mt-2 hover:underline">Remove</button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-300 font-medium">Click or drag & drop your CSV</p>
                  <p className="text-xs text-gray-500 mt-2">Only .csv files supported</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400">.csv</span>
                  </div>
                </div>
              )}
            </div>
            <input id="harvest-file" type="file" accept=".csv" className="hidden"
              onChange={e => setFile(e.target.files[0])} />
          </div>

          {msg && (
            <div className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: msg.ok ? '#D1FAE5' : '#FEE2E2', color: msg.ok ? '#065F46' : '#991B1B' }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={uploading || !file}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
            {uploading ? '⏳ Importing...' : '🚀 Harvest Questions'}
          </button>
        </form>
      </div>
    </div>
  )
}
