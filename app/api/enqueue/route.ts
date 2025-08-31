export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
  loadJobStatus,
} from '@/lib/status'

// Conservative approach: longer waits for blob consistency
async function waitForJobToBeReady(id: string, maxAttempts = 8): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await loadJobStatus(id)
    if (job) {
      console.log(`Job ${id} is ready after ${i + 1} attempts`)
      return true
    }
    // Longer delays: 200ms, 400ms, 600ms, 800ms, 1000ms, 1200ms, 1500ms, 2000ms
    const delay = Math.min(200 + (i * 200), 2000)
    console.log(`Job ${id} not ready yet, waiting ${delay}ms... (attempt ${i + 1}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  console.warn(`Job ${id} still not ready after ${maxAttempts} attempts`)
  return false
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server missing BLOB_READ_WRITE_TOKEN (configure Vercel Blob in Project Settings)' }, { status: 500 });
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
      return NextResponse.json({ error: 'Missing file key/url' }, { status: 400 })
    }

    // 1) Generate ID and create job status
    const id = generateJobId()
    console.log(`Creating job ${id} with fileKey: ${fileKey}`)
    
    try {
      const status = await createJobStatus(id, filename, fileKey)
      console.log(`Job status created successfully for ${id}`)
      
      // 2) Add initial log and save
      status.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Job enqueued with file: ${fileKey}`
      })
      
      await saveJobStatus(status)
      console.log(`Job status saved successfully for ${id}`)

      // 3) Wait for job to be readable with conservative timing
      const isReady = await waitForJobToBeReady(id)
      if (!isReady) {
        console.error(`Job ${id} creation failed - manifest not readable after extended wait`)
        // Don't fail here - return the job ID and let client retry extract manually
        console.log(`Job ${id} created but not immediately readable - client can retry extract`)
      }

    } catch (statusError) {
      console.error(`Failed to create/save job status for ${id}:`, statusError)
      return NextResponse.json({ error: 'Failed to initialize job' }, { status: 500 })
    }

    // 4) Conservative approach: Don't auto-trigger extract, let client handle it
    // This prevents timing issues and gives more control to the frontend
    console.log(`Job ${id} created successfully - extract can be triggered manually`)

    // Optional: Try to trigger extract but don't fail if it doesn't work
    let extractTriggered = false
    try {
      // Longer delay for OpenAI timing considerations
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const kickoffURL = new URL('/api/jobs/extract', req.url)
      console.log(`Attempting to trigger extract for job ${id}`)
      
      const extractResponse = await fetch(kickoffURL.toString(), {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'user-agent': 'auto-trigger-scheduler'
        },
        body: JSON.stringify({ id }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (extractResponse.ok) {
        console.log(`Extract auto-triggered successfully for job ${id}`)
        extractTriggered = true
      } else {
        console.warn(`Extract auto-trigger failed for ${id}: ${extractResponse.status}`)
      }
    } catch (kickoffError) {
      console.warn(`Extract auto-trigger error for ${id}:`, kickoffError)
    }

    return NextResponse.json({ 
      id,
      extractTriggered,
      message: extractTriggered 
        ? 'Job created and extract started'
        : 'Job created - extract can be triggered manually if needed'
    }, { status: 200 })
    
  } catch (err: any) {
    console.error('Enqueue error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Internal error',
      detail: err?.stack ? err.stack.slice(0, 200) : undefined
    }, { status: 500 })
  }
}
