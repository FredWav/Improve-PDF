export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server'
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
  loadJobStatus,
} from '@/lib/status'

// Helper pour attendre que le blob soit disponible
async function waitForJobToBeReady(id: string, maxAttempts = 5): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await loadJobStatus(id)
    if (job) {
      console.log(`Job ${id} is ready after ${i + 1} attempts`)
      return true
    }
    const delay = 100 + (i * 50) // 100ms, 150ms, 200ms, etc.
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

      // 3) CRITICAL: Wait for the job to be readable before triggering extract
      const isReady = await waitForJobToBeReady(id)
      if (!isReady) {
        console.error(`Job ${id} creation failed - manifest not readable`)
        return NextResponse.json({ error: 'Job creation failed - manifest not available' }, { status: 500 })
      }

    } catch (statusError) {
      console.error(`Failed to create/save job status for ${id}:`, statusError)
      return NextResponse.json({ error: 'Failed to initialize job' }, { status: 500 })
    }

    // 4) Now safely trigger extract with a small delay to ensure consistency
    try {
      // Add a small buffer to ensure blob consistency across regions
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const kickoffURL = new URL('/api/jobs/extract', req.url)
      console.log(`Triggering extract for job ${id}`)
      
      const extractResponse = await fetch(kickoffURL.toString(), {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'user-agent': 'internal-job-scheduler'
        },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
      
      if (!extractResponse.ok) {
        console.warn(`Extract kickoff failed for ${id}: ${extractResponse.status}`)
        const errorText = await extractResponse.text().catch(() => 'Unknown error')
        console.warn(`Extract error details:`, errorText)
      } else {
        console.log(`Extract successfully triggered for ${id}`)
      }
    } catch (kickoffError) {
      console.warn(`Extract kickoff error for ${id}:`, kickoffError)
      // Non-blocking: the job is created, extract just didn't start automatically
    }

    return NextResponse.json({ id }, { status: 200 })
  } catch (err: any) {
    console.error('Enqueue error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Internal error',
      detail: err?.stack ? err.stack.slice(0, 200) : undefined
    }, { status: 500 })
  }
}
