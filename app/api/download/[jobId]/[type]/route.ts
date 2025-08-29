import { NextRequest, NextResponse } from 'next/server'
import { loadJobStatus } from '../../../../../lib/status'
import { getFile } from '../../../../../lib/blob'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string; type: string } }
) {
  try {
    const { jobId, type } = params

    if (!jobId || !type) {
      return NextResponse.json(
        { error: 'Job ID and type are required' },
        { status: 400 }
      )
    }

    // Load job status to get output URLs
    const jobStatus = await loadJobStatus(jobId)
    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Handle download all case
    if (type === 'all') {
      // For now, return an error - in real implementation, create a ZIP file
      return NextResponse.json(
        { error: 'Download all not yet implemented - use individual downloads' },
        { status: 501 }
      )
    }

    // Get the specific output URL
    const outputUrl = jobStatus.outputs[type as keyof typeof jobStatus.outputs]
    if (!outputUrl) {
      return NextResponse.json(
        { error: `Output type '${type}' not available` },
        { status: 404 }
      )
    }

    try {
      // Fetch the file from blob storage
      const response = await getFile(outputUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }

      // Set appropriate headers for download
      const headers = new Headers({
        'Content-Disposition': `attachment; filename="ebook-${jobId}.${getFileExtension(type)}"`,
        'Content-Type': getContentType(type),
      })

      // Stream the file content
      return new NextResponse(response.body, {
        status: 200,
        headers
      })
    } catch (error) {
      console.error('File download error:', error)
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getFileExtension(type: string): string {
  const extensions: Record<string, string> = {
    pdf: 'pdf',
    epub: 'epub',
    html: 'html',
    md: 'md',
    report: 'pdf'
  }
  return extensions[type] || 'bin'
}

function getContentType(type: string): string {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    html: 'text/html',
    md: 'text/markdown',
    report: 'application/pdf'
  }
  return contentTypes[type] || 'application/octet-stream'
}