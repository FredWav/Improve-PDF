
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { updateStepStatus, addJobLog } from '@/lib/status'

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN' }, { status: 500 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await addJobLog(id, 'info', 'Job queued')
  try {
    const kickoffURL = new URL('/api/jobs/extract', req.url)
    await fetch(kickoffURL.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
      cache: 'no-store',
    })
  } catch {}
  return NextResponse.json({ ok:true, id })
}
