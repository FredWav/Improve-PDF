import { NextResponse } from 'next/server'
import { saveBlob } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Server missing BLOB_READ_WRITE_TOKEN. Configure a Vercel Blob store and set the token.'
        },
        { status: 500 }
      )
    }

    // Check for placeholder values
    const isPlaceholder = token.includes('your_vercel_blob_token_here') || token.includes('your_') || token.length < 50
    if (isPlaceholder) {
      console.log('[DEV MODE] Using development blob storage (placeholder token detected)')
    } else {
      // Debug temporaire (à retirer quand confirmé)
      console.log(
        '[upload] token prefix:',
        token.slice(0, 16),
        'len=',
        token.length
      )
    }

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
      key: uploaded.pathname, // primary field expected by frontend
      fileId: uploaded.pathname, // added to fix frontend expectation
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