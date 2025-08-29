import { NextRequest, NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData } from '../../../../lib/status'

export async function POST(request: NextRequest) {
  try {
    const { jobId, fileUrl, pageRange } = await request.json()

    if (!jobId || !fileUrl) {
      return NextResponse.json(
        { error: 'Job ID and file URL are required' },
        { status: 400 }
      )
    }

    await addJobLog(jobId, 'info', `Starting PDF extraction for ${fileUrl}`)

    // TODO: Implement actual PDF extraction using pdfjs-dist and tesseract.js
    // For now, create a placeholder implementation
    
    try {
      // Simulate extraction process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock extracted text
      const mockExtractedText = `# Sample Extracted Text

This is a sample extracted text from the PDF document. In a real implementation, this would contain the actual text extracted from the PDF using pdfjs-dist for text-based PDFs or tesseract.js for scanned PDFs.

## Chapter 1: Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Chapter 2: Content

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Conclusion

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

      // Save extracted text
      const outputUrl = await saveProcessingData(jobId, 'extract', mockExtractedText, 'raw.md')

      // Update step status to completed
      await updateStepStatus(jobId, 'extract', 'COMPLETED', 'PDF text extraction completed')

      // Start next step - normalization
      await updateStepStatus(jobId, 'normalize', 'RUNNING', 'Starting text normalization')

      // Trigger normalization job
      try {
        await fetch(`${request.nextUrl.origin}/api/jobs/normalize`, {
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
        console.error('Failed to trigger normalization job:', error)
        await updateStepStatus(jobId, 'normalize', 'FAILED', `Failed to start normalization: ${error}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Extraction completed',
        outputUrl
      })
    } catch (error) {
      await updateStepStatus(jobId, 'extract', 'FAILED', `Extraction failed: ${error}`)
      await addJobLog(jobId, 'error', `PDF extraction failed: ${error}`)
      
      return NextResponse.json(
        { error: 'PDF extraction failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Extract job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}