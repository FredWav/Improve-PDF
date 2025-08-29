import { NextRequest, NextResponse } from 'next/server'
import { loadJobStatus } from '../../../../../lib/status'
import { getFile } from '../../../../../lib/blob'

const TYPE_TO_OUTPUT_KEY: Record<string, keyof import('../../../../../lib/status').JobOutputs> = {
  'raw-text': 'rawText',
  'normalized-text': 'normalizedText',
  'rewritten-text': 'rewrittenText',
  'rendered-html': 'renderedHtml',
  'rendered-markdown': 'renderedMarkdown',
  'pdf-output': 'pdfOutput'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string; type: string } }
) {
  const { jobId, type } = params

  if (!TYPE_TO_OUTPUT_KEY[type]) {
    return NextResponse.json({ error: 'Invalid download type' }, { status: 400 })
  }

  try {
    const status = await loadJobStatus(jobId)
    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const key = TYPE_TO_OUTPUT_KEY[type]
    const outputUrl = status.outputs[key]

    if (!outputUrl) {
      return NextResponse.json(
        { error: `${type} not available for this job` },
        { status: 404 }
      )
    }

    const response = await getFile(outputUrl)
    const blob = await response.blob()

    let contentType = response.headers.get('content-type') || 'application/octet-stream'
    let filenameBase = `${jobId}-${type}`
    switch (type) {
      case 'raw-text':
      case 'normalized-text':
      case 'rewritten-text':
        contentType = 'text/plain'
        filenameBase += '.txt'
        break
      case 'rendered-html':
        contentType = 'text/html'
        filenameBase += '.html'
        break
      case 'rendered-markdown':
        contentType = 'text/markdown'
        filenameBase += '.md'
        break
      case 'pdf-output':
        contentType = 'application/pdf'
        filenameBase += '.pdf'
        break
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filenameBase}"`
      }
    })
  } catch (error) {
    console.error('Download route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
