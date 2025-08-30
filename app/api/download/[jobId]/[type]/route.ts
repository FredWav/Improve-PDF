import { NextRequest, NextResponse } from 'next/server'
import { loadJobStatus } from '@/lib/status'
import { getFile } from '@/lib/blob'

const TYPE_MAP: Record<string, keyof import('@/lib/status').JobOutputs> = {
  'raw-text': 'rawText',
  'normalized-text': 'normalizedText',
  'rewritten-text': 'rewrittenText',
  'rendered-html': 'renderedHtml',
  'rendered-markdown': 'renderedMarkdown',
  'pdf-output': 'pdfOutput',
  html: 'html',
  pdf: 'pdf',
  epub: 'epub',
  md: 'md',
  report: 'report',
  // 👇 nouveaux types optionnels pour inspection/QA
  'images-manifest': 'imagesManifest',
  'rewrite-map': 'rewriteMap',
  toc: 'toc'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string; type: string } }
) {
  const { jobId, type } = params
  const key = TYPE_MAP[type]
  if (!key) {
    return NextResponse.json({ error: 'Invalid download type' }, { status: 400 })
  }

  try {
    const status = await loadJobStatus(jobId)
    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const outputUrl = status.outputs[key]
    if (!outputUrl) {
      return NextResponse.json(
        { error: `Output not available for type "${type}"` },
        { status: 404 }
      )
    }

    const res = await getFile(outputUrl)
    const blob = await res.blob()

    let contentType = res.headers.get('content-type') || 'application/octet-stream'
    let filename = `${jobId}-${type}`

    switch (type) {
      case 'raw-text':
      case 'normalized-text':
      case 'rewritten-text':
      case 'md':
      case 'rewrite-map':
      case 'report':
      case 'toc':
        contentType = 'text/markdown'
        filename += type === 'report' ? '-report.md' : '.md'
        if (type === 'rewrite-map') filename += '' // déjà .md ci-dessus
        if (type === 'toc') filename = `${jobId}-toc.md`
        break
      case 'images-manifest':
        contentType = 'application/json'
        filename += '.json'
        break
      case 'rendered-html':
      case 'html':
        contentType = 'text/html'
        filename += '.html'
        break
      case 'rendered-markdown':
        contentType = 'text/markdown'
        filename += '.md'
        break
      case 'pdf-output':
      case 'pdf':
        contentType = 'application/pdf'
        filename += '.pdf'
        break
      case 'epub':
        contentType = 'application/epub+zip'
        filename += '.epub'
        break
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
