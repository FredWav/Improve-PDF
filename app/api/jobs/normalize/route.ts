import { NextRequest, NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData } from '../../../../lib/status'
import { getText } from '../../../../lib/blob'

export async function POST(request: NextRequest) {
  try {
    const { jobId, inputUrl } = await request.json()

    if (!jobId || !inputUrl) {
      return NextResponse.json(
        { error: 'Job ID and input URL are required' },
        { status: 400 }
      )
    }

    await addJobLog(jobId, 'info', `Starting text normalization`)

    try {
      // Get the extracted text
      const rawText = await getText(inputUrl)

      // TODO: Implement actual French typography normalization
      // For now, create a basic normalization
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Basic normalization (would be more sophisticated in real implementation)
      let normalizedText = rawText
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/"/g, '«') // Start quotes
        .replace(/"/g, '»') // End quotes
        .replace(/--/g, '—') // Em dashes
        .replace(/\s+([.!?])/g, '$1') // Remove space before punctuation
        .replace(/([.!?])\s+/g, '$1 ') // Normalize space after punctuation
        .trim()

      // Save normalized text
      const outputUrl = await saveProcessingData(jobId, 'normalize', normalizedText, 'normalized.md')

      // Update step status to completed
      await updateStepStatus(jobId, 'normalize', 'COMPLETED', 'Text normalization completed')

      // Start next step - rewriting
      await updateStepStatus(jobId, 'rewrite', 'RUNNING', 'Starting AI content improvement')

      // Trigger rewrite job
      try {
        await fetch(`${request.nextUrl.origin}/api/jobs/rewrite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId,
            inputUrl: outputUrl
          })
        })
      } catch (error) {
        console.error('Failed to trigger rewrite job:', error)
        await updateStepStatus(jobId, 'rewrite', 'FAILED', `Failed to start rewrite: ${error}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Normalization completed',
        outputUrl
      })
    } catch (error) {
      await updateStepStatus(jobId, 'normalize', 'FAILED', `Normalization failed: ${error}`)
      await addJobLog(jobId, 'error', `Text normalization failed: ${error}`)
      
      return NextResponse.json(
        { error: 'Text normalization failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Normalize job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}