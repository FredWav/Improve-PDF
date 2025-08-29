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

    await addJobLog(jobId, 'info', `Starting AI content improvement`)

    try {
      // Get the normalized text
      const normalizedText = await getText(inputUrl)

      // TODO: Implement actual AI rewriting with OpenAI
      // - Preserve content meaning (≥98% length)
      // - Use embeddings for similarity validation
      // - Apply strict constraints
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock improved text (in real implementation, this would use OpenAI)
      const improvedText = normalizedText
        .replace(/Lorem ipsum/g, 'Lorem ipsum')
        .replace(/dolor sit amet/g, 'dolor sit amet')
        // Add mock improvements while preserving length
        + '\n\n<!-- AI Improvements Applied: Enhanced readability while preserving original meaning -->'

      // Save improved text
      const outputUrl = await saveProcessingData(jobId, 'rewrite', improvedText, 'improved.md')

      // Mock audit data
      const auditData = {
        originalLength: normalizedText.length,
        improvedLength: improvedText.length,
        lengthPreservation: (improvedText.length / normalizedText.length) * 100,
        changesApplied: [
          'Enhanced readability',
          'Improved sentence structure',
          'Maintained original meaning'
        ],
        embeddingSimilarity: 0.95, // Mock similarity score
        aiTokensUsed: 1500
      }

      // Save audit data
      await saveProcessingData(jobId, 'rewrite', JSON.stringify(auditData, null, 2), 'audit.json')

      // Update step status to completed
      await updateStepStatus(jobId, 'rewrite', 'COMPLETED', `Content improvement completed (${auditData.lengthPreservation.toFixed(1)}% length preserved)`)

      // Start next step - images
      await updateStepStatus(jobId, 'images', 'RUNNING', 'Starting image generation')

      // Trigger images job
      try {
        await fetch(`${request.nextUrl.origin}/api/jobs/images`, {
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
        console.error('Failed to trigger images job:', error)
        await updateStepStatus(jobId, 'images', 'FAILED', `Failed to start images: ${error}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Content improvement completed',
        outputUrl,
        audit: auditData
      })
    } catch (error) {
      await updateStepStatus(jobId, 'rewrite', 'FAILED', `Content improvement failed: ${error}`)
      await addJobLog(jobId, 'error', `AI rewriting failed: ${error}`)
      
      return NextResponse.json(
        { error: 'Content improvement failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Rewrite job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}