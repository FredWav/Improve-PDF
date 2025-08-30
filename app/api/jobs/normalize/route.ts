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

    await updateStepStatus(id, 'normalize', 'RUNNING', 'Début normalisation')
    await addJobLog(id, 'info', 'Nettoyage et structuration du texte')

    const normalized = `# NORMALIZED\nDate: ${new Date().toISOString()}\n\n(Contenu normalisé simulé)`
    const url = await saveProcessingData(id, 'normalize', normalized, 'normalized.txt')
    await addJobOutput(id, 'normalizedText', url)

    await updateStepStatus(id, 'normalize', 'COMPLETED', 'Normalisation terminée')

    // next: rewrite
    try {
      const nextURL = new URL('/api/jobs/rewrite', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'normalize failed' }, { status: 500 })
  }
}
