import { NextResponse } from 'next/server'
import { saveBlob } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
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
      access: 'public',
      addTimestamp: true
    })

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      pathname: uploaded.pathname,
      size: uploaded.size,          // maintenant garanti dans StoredBlobResult
      uploadedAt: uploaded.uploadedAt
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Upload failed' },
      { status: 500 }
    )
  }
}
