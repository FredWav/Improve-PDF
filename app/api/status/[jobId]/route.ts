// app/api/status/[jobId]/route.ts
import { NextResponse } from 'next/server'
import { getJSON } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteParams = { params: { jobId: string } }

/**
 * GET /api/status/:jobId
 * Retourne le manifest JSON stocké dans Blob : jobs/<jobId>/manifest.json
 * 200 => JSON du manifest
 * 404 => manifest introuvable
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const jobId = params?.jobId
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  }

  const key = `jobs/${jobId}/manifest.json`

  try {
    const manifest = await getJSON<any>(key, 8) // retries gérés dans lib/blob.ts
    if (manifest && typeof manifest === 'object') {
      ;(manifest as any).id = jobId
    }
    return NextResponse.json(manifest, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('404') || /not found/i.test(message)) {
      return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to load job', jobId, message }, { status: 500 })
  }
}
