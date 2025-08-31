export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
  loadJobStatus,
} from '@/lib/status'
import { jobCreationQueue } from '@/lib/queue'

// Job creation logic wrapped in queue to avoid concurrency issues
async function createJobInQueue(fileKey: string, filename: string): Promise<string> {
  return jobCreationQueue.add(async () => {
    const id = generateJobId()
    console.log(`[Queue] Creating job ${id} with fileKey: ${fileKey}`)
    
    try {
      const status = await createJobStatus(id, filename, fileKey)
      console.log(`[Queue] Job status created successfully for ${id}`)
      
      // Add initial log
      status.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Job enqueued with file: ${fileKey}`
      })
      
      await saveJobStatus(status)
      console.log(`[Queue] Job status saved successfully for ${id}`)
      
      return id
    } catch (error) {
      console.error(`[Queue] Failed to create job ${id}:`, error)
      throw error
    }
  })
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ 
        error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)',
        step: 'configuration_check'
      }, { status: 500 });
    }

    const ct = req.headers.get('content-type') || ''
    let body: any = {}

    if (ct.includes('application/json')) {
      body = await req.json()
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      body = Object.fromEntries(form as any)
    } else {
      try {
        body = await req.json() 
      } catch { 
        body = {} 
      }
    }

    const fileKey = body.fileKey || body.inputFile || body.key || body.url || body.pathname || body.path
    const filename = body.filename || body.name || 'document.pdf'

    if (!fileKey) {
      return NextResponse.json({ 
        error: 'Missing file key/url',
        step: 'validation'
      }, { status: 400 })
    }

    console.log(`Enqueue request received - fileKey: ${fileKey}, queue length: ${jobCreationQueue.length}`)

    // Create job through sequential queue to avoid concurrency issues
    let jobId: string
    try {
      jobId = await createJobInQueue(fileKey, filename)
      console.log(`Job creation completed: ${jobId}`)
    } catch (statusError) {
      console.error(`Failed to create job:`, statusError)
      return NextResponse.json({ 
        error: 'Failed to initialize job',
        detail: statusError instanceof Error ? statusError.message : String(statusError),
        step: 'job_creation'
      }, { status: 500 })
    }

    // Wait a moment to ensure blob consistency
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify job is readable before proceeding
    let job
    try {
      job = await loadJobStatus(jobId)
      if (!job) {
        throw new Error('Job not found after creation')
      }
      console.log(`Job ${jobId} verified as readable`)
    } catch (verifyError) {
      console.error(`Job ${jobId} not readable after creation:`, verifyError)
      return NextResponse.json({
        error: 'Job created but not immediately readable - please retry in a moment',
        jobId,
        retryable: true,
        step: 'verification'
      }, { status: 202 }) // 202 Accepted - processing but not complete
    }

    // Optional: Try to trigger extract (non-blocking)
    let extractTriggered = false
    try {
      const kickoffURL = new URL('/api/jobs/extract', req.url)
      console.log(`Attempting to trigger extract for job ${jobId}`)
      
      const extractResponse = await fetch(kickoffURL.toString(), {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'user-agent': 'auto-trigger-scheduler'
        },
        body: JSON.stringify({ id: jobId }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000) // 8 second timeout
      })
      
      if (extractResponse.ok) {
        console.log(`Extract auto-triggered successfully for job ${jobId}`)
        extractTriggered = true
      } else {
        const errorText = await extractResponse.text().catch(() => 'Unknown error')
        console.warn(`Extract auto-trigger failed for ${jobId}: ${extractResponse.status} - ${errorText}`)
      }
    } catch (kickoffError) {
      console.warn(`Extract auto-trigger error for ${jobId}:`, kickoffError)
    }

    return NextResponse.json({ 
      id: jobId,
      extractTriggered,
      queueLength: jobCreationQueue.length,
      message: extractTriggered 
        ? 'Job created and extract started'
        : 'Job created - extract can be triggered manually if needed',
      step: 'completed'
    }, { status: 200 })
    
  } catch (err: any) {
    console.error('Enqueue error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Internal error',
      detail: err?.stack ? err.stack.slice(0, 200) : undefined,
      step: 'internal_error'
    }, { status: 500 })
  }
}
