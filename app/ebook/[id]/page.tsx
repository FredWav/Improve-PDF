
'use client'
import { useEffect, useState } from 'react'

export default function JobPage({ params }: { params: { id: string }}) {
  const id = params.id
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let t: any
    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${id}`, { cache: 'no-store' })
        const json = await res.json()
        setData(json)
        if (!json || !json.steps || json.steps.render !== 'COMPLETED') {
          t = setTimeout(poll, 1500)
        }
      } catch (e:any) { setErr(e.message) }
    }
    poll()
    return () => { if (t) clearTimeout(t) }
  }, [id])

  if (err) return <p style={{color:'crimson'}}>Erreur: {err}</p>
  if (!data) return <p>Chargement…</p>

  return (
    <main>
      <h1 style={{fontSize:24, fontWeight:700, marginBottom:8}}>Job {id}</h1>
      <ol>
        {['extract','normalize','rewrite','images','render'].map(step => (
          <li key={step}>{step}: <strong>{data.steps?.[step] || 'PENDING'}</strong></li>
        ))}
      </ol>
      {data.outputs?.pdf && (
        <p style={{marginTop:16}}>
          <a href={`/api/download/${id}/pdf`}>Télécharger le PDF</a>
        </p>
      )}
      <p style={{marginTop:8}}><a href="/">← Retour</a></p>
    </main>
  )
}
