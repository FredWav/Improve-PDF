export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
} from '@/lib/status'

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)' }, { status: 500 });
    }
    const ct = req.headers.get('content-type') || ''
    let body: any = {}

    if (ct.includes('application/json')) {
      body = await req.json()
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else {
      try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)' }, { status: 500 });
    } body = await req.json() } catch { body = {} }
    }

    const fileKey =
      body.fileKey || body.inputFile || body.key || body.url || body.pathname || body.path
    const filename = body.filename || body.name || 'document.pdf'

    if (!fileKey) {
      return NextResponse.json({ error: 'Missing file key/url' }, { status: 400 })
    }

    // 1) Manifest
    const id = generateJobId()
    const status = await createJobStatus(id, filename, fileKey)

    // 2) Log local puis save (pas de relecture)
    status.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Job enqueued with file: ${fileKey}`
    })
    try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)' }, { status: 500 });
    } await saveJobStatus(status) } catch {}

    // 3) Kickoff extract (non bloquant)
    try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)' }, { status: 500 });
    }
      const kickoffURL = new URL('/api/jobs/extract', req.url)
      await fetch(kickoffURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ id }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
