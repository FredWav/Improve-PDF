export const dynamic = 'force-dynamic';

export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
  completeJob,
} from '@/lib/status'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await updateStepStatus(id, 'render', 'RUNNING', 'Début rendu final')
    await addJobLog(id, 'info', 'Rendu HTML/Markdown (stub)')

    const md = `# Document final (stub)\n\nGénéré le ${new Date().toISOString()}`
    const html = `<!doctype html><meta charset="utf-8"><title>Final</title><h1>Document final (stub)</h1><p>Généré le ${new Date().toISOString()}</p>`

    const mdUrl = await saveProcessingData(id, 'render', md, 'final.md')
    const htmlUrl = await saveProcessingData(id, 'render', html, 'final.html')

    await addJobOutput(id, 'md', mdUrl)
    await addJobOutput(id, 'html', htmlUrl)

    await updateStepStatus(id, 'render', 'COMPLETED', 'Rendu terminé')
    await completeJob(id)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'render failed' }, { status: 500 })
  }
}
