import { NextResponse } from 'next/server'
import { saveBlob } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  console.log('Upload request received')
  
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN')
      return NextResponse.json(
        {
          ok: false,
          error: 'Server missing BLOB_READ_WRITE_TOKEN. Configure a Vercel Blob store and set the token.'
        },
        { status: 500 }
      )
    }

    const form = await req.formData()
    const file = form.get('file')
    
    if (!(file instanceof File)) {
      console.error('No valid file found in form data')
      return NextResponse.json(
        { ok: false, error: 'Missing file field named "file"' },
        { status: 400 }
      )
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`)

    // Validate file type
    if (file.type !== 'application/pdf') {
      console.error(`Invalid file type: ${file.type}`)
      return NextResponse.json(
        { ok: false, error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      console.error(`File too large: ${file.size} bytes`)
      return NextResponse.json(
        { ok: false, error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    try {
      const uploaded = await saveBlob(file, {
        prefix: 'uploads/',
        filename: file.name,
        addTimestamp: true,
        allowOverwrite: false,
        addRandomSuffix: true
      })

      console.log(`File uploaded successfully: ${uploaded.url}`)
      console.log(`Pathname: ${uploaded.pathname}`)

      return NextResponse.json({
        ok: true,
        fileId: uploaded.pathname, // Keep for compatibility
        url: uploaded.url,
        pathname: uploaded.pathname,
        size: uploaded.size,
        uploadedAt: uploaded.uploadedAt,
        filename: file.name,
        contentType: file.type
      })
    } catch (uploadError) {
      console.error('Blob upload failed:', uploadError)
      return NextResponse.json(
        { 
          ok: false, 
          error: 'File upload failed',
          detail: uploadError instanceof Error ? uploadError.message : String(uploadError)
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { 
        ok: false, 
        error: err?.message || 'Upload failed',
        detail: err?.stack ? err.stack.slice(0, 200) : undefined
      },
      { status: 500 }
    )
  }
}
