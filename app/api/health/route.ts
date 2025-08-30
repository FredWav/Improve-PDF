
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
  let blobOk = false
  if (hasToken) {
    try {
      const u = `https://blob.vercel-storage.com/__health-${Date.now()}.txt`
      const putRes = await fetch(u, { method: 'PUT', headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }, body: 'ok' })
      if (putRes.ok) {
        await fetch(u, { method: 'DELETE', headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } })
        blobOk = true
      }
    } catch {}
  }
  return NextResponse.json({ ok: hasToken && blobOk, hasToken, blobOk })
}
