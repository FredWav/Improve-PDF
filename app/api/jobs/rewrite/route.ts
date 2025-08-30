export const dynamic = 'force-dynamic';

export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
} from '@/lib/status'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await updateStepStatus(id, 'rewrite', 'RUNNING', 'Début réécriture')
    await addJobLog(id, 'info', 'Réécriture assistée (stub)')

    const rewritten = `# REWRITTEN\nDate: ${new Date().toISOString()}\n\n(Contenu réécrit simulé)`
    const url = await saveProcessingData(id, 'rewrite', rewritten, 'rewritten.txt')
    await addJobOutput(id, 'rewrittenText', url)

    await updateStepStatus(id, 'rewrite', 'COMPLETED', 'Réécriture terminée')

    // next: images
    try {
      const nextURL = new URL('/api/jobs/images', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'rewrite failed' }, { status: 500 })
  }
}
