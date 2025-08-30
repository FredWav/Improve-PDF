export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
} from '@/lib/status'

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let body: any = {}

    if (ct.includes('application/json')) {
      body = await req.json()
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else {
      try { body = await req.json() } catch { body = {} }
    }

    const fileKey =
      body.fileKey || body.inputFile || body.key || body.url || body.pathname || body.path
    const filename = body.filename || body.name || 'document.pdf'

    if (!fileKey) {
      return NextResponse.json({ error: 'Missing file key/url' }, { status: 400 })
    }

    // 1) Crée le job (écrit le manifest)
    const id = generateJobId()
    const status = await createJobStatus(id, filename, fileKey)

    // 2) Ajoute un log localement puis resauve (pas de relecture immédiate)
    status.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Job enqueued with file: ${fileKey}`
    })
    try { await saveJobStatus(status) } catch { /* manifest déjà créé, on ignore */ }

    // 3) Kickoff pipeline -> /api/jobs/extract
    try {
      const kickoffURL = new URL('/api/jobs/extract', req.url)
      // on ne dépend pas de la réponse; l’étape /extract doit renvoyer vite (202/200)
      await fetch(kickoffURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch { /* si ça rate, le job restera en file, pas de 500 */ }

    return NextResponse.json({ id }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
