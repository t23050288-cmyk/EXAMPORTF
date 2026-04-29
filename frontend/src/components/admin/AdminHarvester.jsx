import { useState } from 'react'

export default function AdminHarvester() {
  const [folder, setFolder] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [count, setCount] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder || newFolder)
    fd.append('count', count)
    try {
      const r = await fetch('/api/admin/harvest', { method: 'POST', body: fd })
      const d = await r.json()
      setMsg(`✅ Imported ${d.imported} questions successfully!`)
    } catch { setMsg('❌ Upload failed') }
    setUploading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">🌾 Question Harvester</h2>
        <p className="text-gray-400 text-sm mt-1">Upload your question bank (CSV or Excel)</p>
      </div>

      <div className="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6">
        <form onSubmit={upload}>
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Exam Identity (Folder)</label>
            <select value={folder} onChange={e => setFolder(e.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none mb-2">
              <option value="">Select Existing Folder...</option>
            </select>
            <input value={newFolder} onChange={e => setNewFolder(e.target.value)}
              placeholder="...or Enter New Identity Name"
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Question Count (Optional)</label>
            <input type="number" value={count} onChange={e => setCount(e.target.value)}
              placeholder="Total questions to ingest (e.g. 20)"
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm outline-none" />
            <p className="text-xs text-gray-500 mt-1">If specified, we will pick random questions from your file.</p>
          </div>

          <div className="mb-4">
            <div
              onClick={() => document.getElementById('harvest-file').click()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-purple-500 transition-all">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-300 font-medium">Drop your question bank here</p>
              <p className="text-xs text-gray-500 mt-2">Powered by AI parser · multi-column complex layouts handled with ease</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400">.xlsx</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400">.csv</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400">.xls</span>
              </div>
              {file && <p className="text-green-400 text-sm mt-3">📎 {file.name}</p>}
            </div>
            <input id="harvest-file" type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => setFile(e.target.files[0])} />
          </div>

          {msg && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: msg.includes('✅') ? '#D1FAE5' : '#FEE2E2', color: msg.includes('✅') ? '#065F46' : '#991B1B' }}>{msg}</div>}

          <button type="submit" disabled={uploading || !file}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00C9A7)' }}>
            {uploading ? 'Uploading...' : '🚀 Harvest Questions'}
          </button>
        </form>
      </div>
    </div>
  )
}
