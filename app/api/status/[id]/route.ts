export const dynamic = 'force-dynamic';

export const maxDuration = 60;

import { NextResponse } from 'next/server'
import { loadJobStatus } from '@/lib/status'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const job = await loadJobStatus(params.id)
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(job, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
