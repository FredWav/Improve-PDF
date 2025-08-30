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
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else {
      try { body = await req.json() } catch { body = {} }
    }

    // Tolérant sur les champs possibles
    const fileKey =
      body.fileKey ||
      body.inputFile ||
      body.key ||
      body.url ||
      body.pathname ||
      body.path

    const filename = body.filename || body.name || 'document.pdf'

    if (!fileKey) {
      return NextResponse.json({ error: 'Missing file key/url' }, { status: 400 })
    }

    // 1) Crée le job (écrit le manifest)
    const id = generateJobId()
    const status = await createJobStatus(id, filename, fileKey)

    // 2) ➜ NE PAS recharger : on push le log localement puis on resauve
    status.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Job enqueued with file: ${fileKey}`
    })

    // On essaye de sauver, mais on ne fait pas échouer l’appel si ça rate (évite un 500 inutile)
    try {
      await saveJobStatus(status)
    } catch {
      /* noop – le manifest est déjà créé, le log suivra plus tard si besoin */
    }

    return NextResponse.json({ id }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
