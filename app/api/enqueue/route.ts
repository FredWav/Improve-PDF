import { NextRequest, NextResponse } from 'next/server'
import { createJobStatus, generateJobId } from '../../../lib/status'
import { appendJobId } from '../../../lib/jobIndex'

// Enqueue endpoint: creates a job manifest + index entry and returns immediately (202 Accepted)
// Processing steps (like setting extract RUNNING) are deferred to the extraction worker route.
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

    // 1. Create manifest first so that any later step updates find it
    await createJobStatus(jobId, filename, resourceRef)

    // 2. Append to index (retry logic handled inside appendJobId)
    await appendJobId(jobId)

    // 3. Trigger extraction asynchronously (fire-and-forget). We do not await to avoid
    //    coupling enqueue latency to downstream processing or immediate storage consistency.
    ;(async () => {
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
        console.error('Failed to trigger extraction job (deferred):', error)
        // Extraction route itself will handle marking failure if it runs and errors.
        // If this network call itself fails immediately, a later retry mechanism / manual requeue could be added.
      }
    })()

    return NextResponse.json({
      jobId,
      status: 'accepted',
      message: 'Job accepted and scheduled for processing'
    }, { status: 202 })
  } catch (error) {
    console.error('Enqueue error:', error)
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 }
    )
  }
}