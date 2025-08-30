
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData, addJobOutput } from '@/lib/status'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await updateStepStatus(id, 'extract', 'RUNNING')
    await addJobLog(id, 'info', 'Extraction started')
    const url = await saveProcessingData(id, 'extract', 'Texte extrait (démo)', 'raw.txt')
    await addJobOutput(id, 'rawText', url)
    await updateStepStatus(id, 'extract', 'COMPLETED')

    try {
      const nextURL = new URL('/api/jobs/normalize', req.url)
      await fetch(nextURL.toString(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }), cache: 'no-store' })
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'extract failed' }, { status: 500 })
  }
}
