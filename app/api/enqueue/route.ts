import { NextRequest, NextResponse } from 'next/server'
import { createJobStatus, generateJobId, updateStepStatus } from '../../../lib/status'

export async function POST(request: NextRequest) {
  try {
    let payload: any
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { fileId, filename, url } = payload || {}

    if (!fileId && !url) {
      return NextResponse.json(
        { error: 'Either fileId or url is required' },
        { status: 400 }
      )
    }

    const resourceRef = url || fileId
    const jobId = generateJobId()

    await createJobStatus(jobId, filename, resourceRef)
    await updateStepStatus(jobId, 'extract', 'RUNNING', 'Starting PDF text extraction')

    try {
      await fetch(`${request.nextUrl.origin}/api/jobs/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          fileUrl: resourceRef,
          pageRange: { start: 0, count: 30 }
        })
      })
    } catch (error) {
      console.error('Failed to trigger extraction job:', error)
      await updateStepStatus(jobId, 'extract', 'FAILED', `Failed to start extraction: ${error}`)
    }

    return NextResponse.json({
      jobId,
      status: 'queued',
      message: 'Job has been queued for processing'
    })
  } catch (error) {
    console.error('Enqueue error:', error)
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 }
    )
  }
}