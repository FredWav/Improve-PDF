export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let jobs: any[] = []
    try {
      const mod: any = await import('@/lib/jobIndex')
      const fn = mod.getRecentJobs || mod.listRecentJobs || mod.listJobs || mod.default
      if (typeof fn === 'function') {
        const res = await fn()
        jobs = Array.isArray(res) ? res : (res?.jobs ?? [])
      }
    } catch { jobs = [] }
    return NextResponse.json({ jobs }, { status: 200 })
  } catch {
    return NextResponse.json({ jobs: [] }, { status: 200 })
  }
}
