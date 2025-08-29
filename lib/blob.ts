import { put, del, list, type PutBlobResult } from '@vercel/blob'

export interface SaveBlobOptions {
  key?: string
  prefix?: string
  filename?: string
  addTimestamp?: boolean
  access?: 'public'
  allowOverwrite?: boolean
  addRandomSuffix?: boolean
}

export interface StoredBlobResult extends PutBlobResult {
  size: number
  uploadedAt: string
}

function buildKey(file: File | Blob, opts?: SaveBlobOptions): string {
  if (opts?.key) return opts.key.replace(/^\/+/,'')
  const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/,'')
  const baseName =
    opts?.filename ??
    (file instanceof File ? file.name : `file-${Date.now()}.bin`)
  const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`
  return `${prefix}${ts}${baseName}`
}

function requireReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'Missing BLOB_READ_WRITE_TOKEN environment variable. Create a Blob store in Vercel and add the token to your project settings.'
    )
  }
  return token
}

export async function saveBlob(
  file: File | Blob,
  opts?: SaveBlobOptions
): Promise<StoredBlobResult> {
  const key = buildKey(file, opts)
  const token = requireReadWriteToken()

  const putOptions: any = {
    access: opts?.access ?? 'public',
    token
  }
  if (opts?.allowOverwrite) putOptions.allowOverwrite = true
  if (opts?.addRandomSuffix) putOptions.addRandomSuffix = true

  let putResult: PutBlobResult
  try {
    putResult = await put(key, file, putOptions)
  } catch (err: any) {
    throw new Error(
      `Blob upload failed for key="${key}": ${err?.message || String(err)}`
    )
  }

  const size = file instanceof File ? file.size : (file as any).size ?? 0
  const uploadedAt =
    (putResult as any).uploadedAt
      ? new Date((putResult as any).uploadedAt).toISOString()
      : new Date().toISOString()

  return { ...putResult, size, uploadedAt }
}

export async function listBlobs(prefix = 'uploads/') {
  return list({
    prefix,
    token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  })
}

export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, {
    token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  })
}

export async function getFile(pathOrUrl: string): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const url = isFull
    ? pathOrUrl
    : `https://blob.vercel-storage.com/${pathOrUrl.replace(/^\/+/,'')}`

  const headers: Record<string, string> = {}
  const token =
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch blob "${pathOrUrl}": ${res.status} ${res.statusText}`
    )
  }
  return res
}

export async function getText(pathOrUrl: string): Promise<string> {
  const res = await getFile(pathOrUrl)
  return res.text()
}

export async function getJSON<T = any>(pathOrUrl: string): Promise<T> {
  const txt = await getText(pathOrUrl)
  return JSON.parse(txt) as T
}

export async function uploadText(
  text: string,
  key: string
): Promise<StoredBlobResult>
export async function uploadText(
  text: string,
  opts?: SaveBlobOptions
): Promise<StoredBlobResult>
export async function uploadText(
  text: string,
  keyOrOpts?: string | SaveBlobOptions
): Promise<StoredBlobResult> {
  const blob = new Blob([text], { type: 'text/plain' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}

export async function uploadJSON(
  data: any,
  key: string
): Promise<StoredBlobResult>
export async function uploadJSON(
  data: any,
  opts?: SaveBlobOptions
): Promise<StoredBlobResult>
export async function uploadJSON(
  data: any,
  keyOrOpts?: string | SaveBlobOptions
): Promise<StoredBlobResult> {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}