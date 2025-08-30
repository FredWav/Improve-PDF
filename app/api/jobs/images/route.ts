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

    await updateStepStatus(id, 'images', 'RUNNING', 'Début images')
    await addJobLog(id, 'info', 'Génération/placement images (stub)')

    // stub: on dépose juste un petit artefact texte
    const note = `# IMAGES\nDate: ${new Date().toISOString()}\n\n(Aucune image générée dans le stub)`
    const url = await saveProcessingData(id, 'images', note, 'images.txt')
    await addJobOutput(id, 'report', url)

    await updateStepStatus(id, 'images', 'COMPLETED', 'Images terminées')

    // next: render
    try {
      const nextURL = new URL('/api/jobs/render', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'images failed' }, { status: 500 })
  }
}
