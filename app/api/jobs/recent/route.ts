// app/api/jobs/recent/route.ts
import { NextResponse } from 'next/server'
import { listBlobs, getJSON } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/jobs/recent?limit=20
 * Liste les derniers jobs (lecture des manifests) par ordre décroissant de date.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50))

  // On liste tous les manifests sous jobs/
  const listing = await listBlobs('jobs/')
  const manifests = (listing?.blobs || [])
    .filter(b => b.pathname.endsWith('/manifest.json'))
    .sort((a: any, b: any) => {
      const da = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const db = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      if (db !== da) return db - da
      return b.pathname.localeCompare(a.pathname)
    })
    .slice(0, limit)

  // On charge les manifests en parallèle (raisonnablement)
  const jobs = await Promise.all(
    manifests.map(async (m: any) => {
      const match = m.pathname.match(/jobs\/(job-[^/]+)\/manifest\.json$/)
      const id = match ? match[1] : undefined
      try {
        const data = await getJSON<any>(m.pathname, 4)
        if (data && typeof data === 'object') {
          ;(data as any).id = id
          ;(data as any).manifestUrl = m.url
        }
        return data
      } catch {
        return { id, error: 'unreadable', manifestUrl: m.url }
      }
    })
  )

  return NextResponse.json({ count: jobs.length, jobs }, { status: 200 })
}
