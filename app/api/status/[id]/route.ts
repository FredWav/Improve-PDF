
import { NextResponse } from 'next/server'
import { loadJobStatus } from '@/lib/status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(_req: Request, ctx: { params: { id: string }}) {
  try {
    const js = await loadJobStatus(ctx.params.id)
    return NextResponse.json(js)
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Not found' }, { status: 404 })
  }
}
