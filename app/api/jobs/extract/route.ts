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

    // On utilise TES fonctions, on n’en supprime aucune.
    await updateStepStatus(id, 'extract', 'RUNNING', 'Début extraction')
    await addJobLog(id, 'info', 'Lecture du PDF et extraction du texte')

    // ----- stub d’extraction (remplace par ta vraie logique si besoin)
    const raw = `# RAW EXTRACT\nDate: ${new Date().toISOString()}\n\n(Contenu extrait simulé)`
    const rawUrl = await saveProcessingData(id, 'extract', raw, 'raw.txt')
    await addJobOutput(id, 'rawText', rawUrl)
    // -----

    await updateStepStatus(id, 'extract', 'COMPLETED', 'Extraction terminée')

    // Enchaîne l’étape suivante sans bloquer
    try {
      const nextURL = new URL('/api/jobs/normalize', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch { /* noop */ }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'extract failed' }, { status: 500 })
  }
}
