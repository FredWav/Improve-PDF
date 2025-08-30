
'use client'
import { useState } from 'react'

export default function Page() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setErr(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      const id = json.id
      // kick off processing
      await fetch('/api/enqueue', { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ id }) })
      window.location.href = `/ebook/${id}`
    } catch (e:any) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <main>
      <h1 style={{fontSize:28, fontWeight:700, marginBottom:10}}>Improve PDF</h1>
      <p style={{marginBottom:20}}>Charge un PDF, on le transforme en ebook enrichi (démo).</p>
      <input type="file" accept=".pdf" onChange={onChange} disabled={busy} />
      {busy && <p>Upload en cours…</p>}
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <hr style={{margin:'24px 0'}}/>
      <p><a href="/api/health" target="_blank">Vérifier /api/health</a></p>
    </main>
  )
}
