
import { NextResponse } from 'next/server'
import { uploadFile } from '@/lib/blob'
import { createJobStatus, generateJobId } from '@/lib/status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok:false, error: 'Server missing BLOB_READ_WRITE_TOKEN' }, { status: 500 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok:false, error: 'Missing file' }, { status: 400 })
  }
  const id = generateJobId()
  const up = await uploadFile(file, { key: `jobs/${id}/input.pdf`, addTimestamp: false, allowOverwrite: true })
  await createJobStatus(id, up.pathname)
  return NextResponse.json({ ok:true, id, fileKey: up.pathname })
}
