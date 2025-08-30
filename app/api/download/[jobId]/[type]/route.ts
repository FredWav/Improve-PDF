
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest, ctx: { params: { jobId: string, type: string }}) {
  const { jobId, type } = ctx.params
  if (type !== 'pdf') return new NextResponse('Not implemented', { status: 400 })
  const key = `jobs/${jobId}/outputs/ebook.pdf`
  const url = `https://blob.vercel-storage.com/${encodeURI(key)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN}` }, cache: 'no-store' })
  if (!res.ok) return new NextResponse('Not found', { status: 404 })
  const buf = await res.arrayBuffer()
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="ebook-${jobId}.pdf"`
    }
  })
}
