import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, createUniqueFilename, validateFileType } from '../../../lib/blob'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(file.name, ['pdf'])) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uniqueFilename = createUniqueFilename(file.name)

    // Upload to Vercel Blob
    const result = await uploadFile(file, uniqueFilename)

    // Extract file ID from pathname for easier reference
    const fileId = result.pathname.split('/').pop()?.split('-')[0] || uniqueFilename

    return NextResponse.json({
      fileId,
      url: result.url,
      pathname: result.pathname,
      originalName: file.name,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}