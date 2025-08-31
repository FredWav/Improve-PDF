import { NextResponse } from 'next/server'
import { getAllJobsSummaries } from '@/lib/jobsNoIndex'

export async function GET() {
  try {
    const jobs = await getAllJobsSummaries()
    return NextResponse.json(jobs)
  } catch (e) {
    console.error('Failed to list jobs:', e)
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 })
  }
}
