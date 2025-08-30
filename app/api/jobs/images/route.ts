
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData } from '@/lib/status'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await updateStepStatus(id, 'images', 'RUNNING')
    await addJobLog(id, 'info', 'Images generation started')
    await saveProcessingData(id, 'images', 'Images placeholders (démo)', 'images.json')
    await updateStepStatus(id, 'images', 'COMPLETED')

    try {
      const nextURL = new URL('/api/jobs/render', req.url)
      await fetch(nextURL.toString(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }), cache: 'no-store' })
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'images failed' }, { status: 500 })
  }
}
