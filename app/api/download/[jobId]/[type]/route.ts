export const dynamic = 'force-dynamic';

export const maxDuration = 60;

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
  report: 'report'
}

export async function GET(
  req: NextRequest,
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

    // Récupère le fichier depuis Vercel Blob (ou autre backend)…
    const upstream = await getFile(outputUrl)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream fetch failed (${upstream.status})` },
        { status: 502 }
      )
    }

    // Détermine content-type + nom du fichier (exactement comme ton code)
    let contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    let filename = `${jobId}-${type}`

    switch (type) {
      case 'raw-text':
      case 'normalized-text':
      case 'rewritten-text':
      case 'md':
        contentType = 'text/markdown'
        filename += '.md'
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
      case 'report':
        contentType = 'text/markdown'
        filename += '-report.md'
        break
    }

    // Option ?inline=1 pour affichage dans le navigateur si tu veux
    const inline = req.nextUrl.searchParams.get('inline') === '1'

    // On streame le corps directement (plus efficace que blob/arrayBuffer)
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${filename}"`
    )
    // On évite d'envoyer un content-length incorrect en proxy
    headers.set('Cache-Control', 'no-store')

    return new NextResponse(upstream.body, { headers })
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
