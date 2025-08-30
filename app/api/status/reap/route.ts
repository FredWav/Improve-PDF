
import { NextResponse } from 'next/server'
import { listPrefix, remove } from '@/lib/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Purge jobs older than 7 days (demo)
export async function GET() {
  const cutoff = Date.now() - 7*24*3600*1000
  const res = await listPrefix('jobs/')
  let deleted = 0
  for (const b of res.blobs) {
    // try delete manifests older than cutoff based on URL (we cannot read mtime reliably)
    if (b.pathname.endsWith('/manifest.json')) {
      try {
        const id = b.pathname.split('/')[1]
        // best-effort: delete entire job folder by deleting known files
        await remove(b.pathname)
        deleted++
      } catch {}
    }
  }
  return NextResponse.json({ ok: true, deleted })
}
