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

    // Verify job exists before starting
    const existingJob = await loadJobStatus(id)
    if (!existingJob) {
      console.error(`Extract: Job ${id} not found`)
      return NextResponse.json({ error: `Job ${id} not found` }, { status: 404 })
    }

    console.log(`Job ${id} found, starting extraction`)

    // Start the step
    await updateStepStatus(id, 'extract', 'RUNNING', 'Extraction en cours')
    await addJobLog(id, 'info', 'Extract: started')

    // --- MOCK EXTRACT (replace with real PDF extraction)
    console.log(`Performing mock extraction for job ${id}`)
    
    const raw = `# EXTRACTED CONTENT
Job ID: ${id}
Extraction Date: ${new Date().toISOString()}
Input File: ${existingJob.inputFile || 'unknown'}

## Mock Content
This is simulated extracted text from a PDF document. 
In a real implementation, this would be actual text extracted using pdfjs-dist.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
nostrud exercitation ullamco laboris.

### Section 1: Introduction
Real content would be extracted here from the PDF pages.

### Section 2: Main Content  
More extracted content would appear here.

### Section 3: Conclusion
Final extracted content section.

---
Total pages processed: 1 (mock)
Extraction method: Mock simulation
`

    const rawUrl = await saveProcessingData(id, 'extract', raw, 'raw.txt')
    await addJobOutput(id, 'rawText', rawUrl)
    await addJobLog(id, 'info', `Extract: saved raw text to ${rawUrl}`)
    
    console.log(`Mock extraction completed for job ${id}`)
    // ---

    await updateStepStatus(id, 'extract', 'COMPLETED', 'Extraction terminée')
    await addJobLog(id, 'info', 'Extract: completed successfully')

    console.log(`Extract completed for job ${id}, triggering normalize`)

    // Chain to normalize step (non-blocking)
    try {
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
        console.warn(`Normalize kickoff failed for job ${id}: ${normalizeResponse.status}`)
        await addJobLog(id, 'warn', `Normalize kickoff failed: ${normalizeResponse.status}`)
      } else {
        console.log(`Normalize successfully triggered for job ${id}`)
      }
    } catch (e: any) {
      console.warn(`Normalize kickoff error for job ${id}:`, e)
      await addJobLog(id, 'warn', `Kickoff normalize failed: ${e?.message || e}`)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
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
      detail: e?.stack ? e.stack.slice(0, 200) : undefined
    }, { status: 500 })
  }
}
