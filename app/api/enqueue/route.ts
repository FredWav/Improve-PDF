import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  addJobLog,
} from '@/lib/status'

export async function POST(req: Request) {
  try {
    // Support JSON, form-urlencoded, fallback
    const ct = req.headers.get('content-type') || ''
    let body: any = {}
    if (ct.includes('application/json')) {
      body = await req.json()
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else {
      try { body = await req.json() } catch { body = {} }
    }

    // Accepte plusieurs clés possibles venant de /api/upload
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

    const id = generateJobId()
    await createJobStatus(id, filename, fileKey)
    await addJobLog(id, 'info', `Job enqueued with file: ${fileKey}`)

    return NextResponse.json({ id }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
