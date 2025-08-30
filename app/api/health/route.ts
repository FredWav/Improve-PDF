export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'

export async function GET() {
  try {
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
    let blobOk = false
    if (hasToken) {
      const res = await put('healthchecks/ok.txt', new Blob([new Date().toISOString()]), {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
        addTimestamp: true,
      } as any)
      blobOk = !!res?.url
      try { await del(res.url, { token: process.env.BLOB_READ_WRITE_TOKEN as string } as any) } catch {}
    }
    return NextResponse.json({ ok: hasToken && blobOk, hasToken, blobOk })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'health failed' }, { status: 500 })
  }
}
