export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
  loadJobStatus,
} from '@/lib/status'

// Helper pour attendre que le job soit disponible avec retry
async function waitForJobAvailability(id: string, maxAttempts = 10): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const job = await loadJobStatus(id)
      if (job) {
        console.log(`Job ${id} found on attempt ${attempt + 1}`)
        return job
      }
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed for job ${id}:`, error instanceof Error ? error.message : String(error))
    }
    
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, puis 1s max
    const delay = Math.min(50 * Math.pow(2, attempt), 1000)
    console.log(`Job ${id} not available, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  throw new Error(`Job ${id} not found after ${maxAttempts} attempts`)
}

export async function POST(req: Request) {
  let id: string | null = null
  try {
    const body = await req.json().catch(() => ({} as any))
    id = String(body?.id || '')
    
    if (!id) {
      console.error('Extract called without job ID')
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    console.log(`Extract starting for job ${id}`)

    // Wait for job to be available with retry logic
    let existingJob: any
    try {
      existingJob = await waitForJobAvailability(id)
      console.log(`Job ${id} successfully loaded, starting extraction`)
    } catch (availabilityError) {
      console.error(`Extract: Job ${id} not available:`, availabilityError)
      return NextResponse.json({ 
        error: `Job ${id} not found - may still be initializing`,
        retry: true // Signal to client that retry might work
      }, { status: 404 })
    }

    // Start the step
    await updateStepStatus(id, 'extract', 'RUNNING', 'Extraction en cours')
    await addJobLog(id, 'info', 'Extract: started successfully')

    // --- MOCK EXTRACT (replace with real PDF extraction)
    console.log(`Performing mock extraction for job ${id}`)
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const raw = `# EXTRACTED CONTENT
Job ID: ${id}
Extraction Date: ${new Date().toISOString()}
Input File: ${existingJob.inputFile || 'unknown'}
Filename: ${existingJob.filename || 'document.pdf'}

## Mock Content
This is simulated extracted text from a PDF document. 
In a real implementation, this would be actual text extracted using pdfjs-dist.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Section 1: Introduction
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.

### Section 2: Main Content  
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore.

### Section 3: Conclusion
At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis 
praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias.

---
Total pages processed: 3 (mock simulation)
Words extracted: ~150 words
Extraction method: Mock simulation for development
Processing time: ${new Date().toISOString()}
`

    try {
      const rawUrl = await saveProcessingData(id, 'extract', raw, 'raw.txt')
      await addJobOutput(id, 'rawText', rawUrl)
      await addJobLog(id, 'info', `Extract: saved raw text to ${rawUrl}`)
      console.log(`Mock extraction completed for job ${id}, saved to ${rawUrl}`)
    } catch (saveError) {
      console.error(`Failed to save extraction data for job ${id}:`, saveError)
      throw new Error(`Failed to save extraction results: ${saveError instanceof Error ? saveError.message : String(saveError)}`)
    }

    await updateStepStatus(id, 'extract', 'COMPLETED', 'Extraction terminée avec succès')
    await addJobLog(id, 'info', 'Extract: completed successfully')

    console.log(`Extract completed for job ${id}, triggering normalize`)

    // Chain to normalize step (non-blocking with better error handling)
    try {
      // Small delay to ensure the extract step is fully committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const nextURL = new URL('/api/jobs/normalize', req.url)
      const normalizeResponse = await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'user-agent': 'internal-job-scheduler'
        },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
      
      if (!normalizeResponse.ok) {
        const errorText = await normalizeResponse.text().catch(() => 'Unknown error')
        console.warn(`Normalize kickoff failed for job ${id}: ${normalizeResponse.status} - ${errorText}`)
        await addJobLog(id, 'warn', `Normalize kickoff failed: ${normalizeResponse.status}`)
      } else {
        console.log(`Normalize successfully triggered for job ${id}`)
        await addJobLog(id, 'info', 'Normalize step triggered successfully')
      }
    } catch (e: any) {
      console.warn(`Normalize kickoff error for job ${id}:`, e)
      await addJobLog(id, 'warn', `Kickoff normalize failed: ${e?.message || e}`)
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Extraction completed successfully',
      jobId: id 
    }, { status: 200 })
    
  } catch (e: any) {
    console.error(`Extract error for job ${id}:`, e)
    
    try {
      if (id) {
        await addJobLog(id, 'error', `Extract failed: ${e?.message || String(e)}`)
        await updateStepStatus(id, 'extract', 'FAILED', e?.message || 'Extraction échouée')
      }
    } catch (statusError) {
      console.error(`Failed to update status after extract error for job ${id}:`, statusError)
    }
    
    return NextResponse.json({ 
      error: e?.message || 'extract failed',
      detail: e?.stack ? e.stack.slice(0, 200) : undefined,
      jobId: id
    }, { status: 500 })
  }
}
