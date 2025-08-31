// app/api/status/[id]/route.ts
import { NextResponse } from 'next/server'
import { getJSON } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteParams = { params: { id: string } }

/**
 * GET /api/status/:id
 * Retourne le manifest JSON stocké dans Blob : jobs/<id>/manifest.json
 * 200 => JSON du manifest
 * 404 => manifest introuvable
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const key = `jobs/${id}/manifest.json`

  try {
    const manifest = await getJSON<any>(key, 8) // retries gérés dans lib/blob.ts
    if (manifest && typeof manifest === 'object') {
      ;(manifest as any).id = id
    }
    return NextResponse.json(manifest, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('404') || /not found/i.test(message)) {
      return NextResponse.json({ error: 'Job not found', id }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to load job', id, message }, { status: 500 })
  }
}
