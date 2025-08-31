export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
} from '@/lib/status'

export async function POST(req: Request) {
  let id: string | null = null
  try {
    const body = await req.json().catch(() => ({} as any))
    id = String(body?.id || '')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Démarre l’étape
    await updateStepStatus(id, 'extract', 'RUNNING', 'Extraction en cours')
    await addJobLog(id, 'info', 'Extract: started')

    // --- EXTRACT (stub de base, à remplacer par ta vraie logique si besoin)
    const raw = `# RAW EXTRACT
Date: ${new Date().toISOString()}

(Contenu extrait simulé)`
    const rawUrl = await saveProcessingData(id, 'extract', raw, 'raw.txt')
    await addJobOutput(id, 'rawText', rawUrl)
    await addJobLog(id, 'info', `Extract: saved raw to ${rawUrl}`)
    // ---

    await updateStepStatus(id, 'extract', 'COMPLETED', 'Extraction terminée')
    await addJobLog(id, 'info', 'Extract: completed')

    // Enchaîne normalize en arrière-plan
    try {
      const nextURL = new URL('/api/jobs/normalize', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch (e: any) {
      // pas bloquant, mais on log
      await addJobLog(id, 'warn', `Kickoff normalize failed: ${e?.message || e}`)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    console.error('Extract error:', e)
    try {
      if (id) {
        await addJobLog(id, 'error', `Extract failed: ${e?.message || String(e)}`)
        await updateStepStatus(id, 'extract', 'FAILED', e?.message || 'Extraction échouée')
      }
    } catch {}
    return NextResponse.json({ error: e?.message || 'extract failed' }, { status: 500 })
  }
}
