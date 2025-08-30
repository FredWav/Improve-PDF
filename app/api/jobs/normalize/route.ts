
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData, addJobOutput } from '@/lib/status'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await updateStepStatus(id, 'normalize', 'RUNNING')
    await addJobLog(id, 'info', 'Normalize started')
    const url = await saveProcessingData(id, 'normalize', 'Texte normalisé (démo)', 'normalized.txt')
    await addJobOutput(id, 'normalizedText', url)
    await updateStepStatus(id, 'normalize', 'COMPLETED')

    try {
      const nextURL = new URL('/api/jobs/rewrite', req.url)
      await fetch(nextURL.toString(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }), cache: 'no-store' })
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'normalize failed' }, { status: 500 })
  }
}
