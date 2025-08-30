
import { NextResponse } from 'next/server'
import { listPrefix, getJSON } from '@/lib/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const res = await listPrefix('jobs/')
    const ids = Array.from(new Set(res.blobs
      .map(b => b.pathname)
      .map(p => (p.match(/^jobs\/([^\/]+)/)?.[1]))
      .filter(Boolean)))
    return NextResponse.json({ ids })
  } catch (e:any) {
    return NextResponse.json({ ids: [], error: e?.message }, { status: 200 })
  }
}
