import { NextResponse } from 'next/server'
import { saveBlob } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Server missing BLOB_READ_WRITE_TOKEN. Configure a Vercel Blob store and set the token.'
        },
        { status: 500 }
      )
    }

    // Debug temporaire (à retirer quand confirmé)
    console.log(
      '[upload] token prefix:',
      process.env.BLOB_READ_WRITE_TOKEN.slice(0, 16),
      'len=',
      process.env.BLOB_READ_WRITE_TOKEN.length
    )

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Missing file field named "file"' },
        { status: 400 }
      )
    }

    const uploaded = await saveBlob(file, {
      prefix: 'uploads/',
      filename: file.name,
      addTimestamp: true
    })

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      pathname: uploaded.pathname,
      size: uploaded.size,
      uploadedAt: uploaded.uploadedAt
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}