import { NextRequest, NextResponse } from 'next/server'
import { createJobStatus, generateJobId, updateStepStatus } from '../../../lib/status'

export async function POST(request: NextRequest) {
  try {
    const { fileId, filename, url } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Generate a unique job ID
    const jobId = generateJobId()

    // Create initial job status
    const jobStatus = await createJobStatus(jobId, filename, url || fileId)

    // Mark extraction step as running and trigger it
    await updateStepStatus(jobId, 'extract', 'RUNNING', 'Starting PDF text extraction')

    // In a real implementation, you would either:
    // 1. Use Vercel Queues to enqueue the job
    // 2. Use a cron job to process pending jobs
    // 3. Call the extraction API directly (for immediate processing)
    
    // For now, we'll trigger the extraction job directly
    try {
      // Trigger extraction job
      await fetch(`${request.nextUrl.origin}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          fileUrl: url || fileId,
          pageRange: { start: 0, count: 30 } // Start with first 30 pages
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