
import { NextResponse } from 'next/server'
import { listPrefix, getJSON } from '@/lib/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const res = await listPrefix('jobs/')
    const manifests = res.blobs.filter(b => b.pathname.endsWith('/manifest.json'))
    const jobs: any[] = []
    for (const m of manifests) {
      try {
        const js = await getJSON<any>(m.pathname)
        jobs.push({ id: js.id, createdAt: js.createdAt, updatedAt: js.updatedAt, steps: js.steps })
      } catch {}
    }
    jobs.sort((a,b) => (a.createdAt < b.createdAt ? 1 : -1))
    return NextResponse.json({ jobs })
  } catch (e:any) {
    return NextResponse.json({ jobs: [], error: e?.message }, { status: 200 })
  }
}
