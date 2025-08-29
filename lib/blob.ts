import { del, list, put, type PutBlobResult } from '@vercel/blob'

export interface SaveBlobOptions {
  key?: string
  prefix?: string
  filename?: string
  addTimestamp?: boolean
  access?: 'public' | 'private'
}

export interface StoredBlobResult extends PutBlobResult {
  size: number
  uploadedAt: string
}

/**
 * Sauvegarde générique (Blob/File) dans Vercel Blob Storage
 * Retour enrichi avec size + uploadedAt déterministes pour ton application.
 */
export async function saveBlob(
  file: File | Blob,
  opts?: SaveBlobOptions
): Promise<StoredBlobResult> {
  let key: string
  if (opts?.key) {
    key = opts.key.replace(/^\/+/, '')
  } else {
    const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/, '')
    const baseName =
      opts?.filename ??
      (file instanceof File ? file.name : `file-${Date.now()}.bin`)
    const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`
    key = `${prefix}${ts}${baseName}`
  }

  const putResult = await put(key, file, {
    access: opts?.access ?? 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  })

  // Taille fiable depuis l’objet d’entrée
  const size =
    file instanceof File
      ? file.size
      : // certains blobs peuvent avoir size
        (file as any).size ?? 0

  // uploadedAt parfois présent selon versions; on normalise en string ISO
  const uploadedAt =
    (putResult as any).uploadedAt
      ? new Date((putResult as any).uploadedAt).toISOString()
      : new Date().toISOString()

  return {
    ...putResult,
    size,
    uploadedAt
  }
}

export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN })
}

export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
}

export async function getFile(pathOrUrl: string): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const url = isFull
    ? pathOrUrl
    : `https://blob.vercel-storage.com/${pathOrUrl.replace(/^\/+/, '')}`

  const headers: Record<string, string> = {}
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch blob ${pathOrUrl}: ${res.status} ${res.statusText}`
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

/* =======================
 * Surcharges uploadText
 * ======================= */
export async function uploadText(text: string, key: string): Promise<StoredBlobResult>
export async function uploadText(text: string, opts?: SaveBlobOptions): Promise<StoredBlobResult>
export async function uploadText(
  text: string,
  keyOrOpts?: string | SaveBlobOptions
): Promise<StoredBlobResult> {
  const blob = new Blob([text], { type: 'text/plain' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, access: 'private' })
  }
  return saveBlob(blob, keyOrOpts)
}

/* =======================
 * Surcharges uploadJSON
 * ======================= */
export async function uploadJSON(data: any, key: string): Promise<StoredBlobResult>
export async function uploadJSON(data: any, opts?: SaveBlobOptions): Promise<StoredBlobResult>
export async function uploadJSON(
  data: any,
  keyOrOpts?: string | SaveBlobOptions
): Promise<StoredBlobResult> {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, access: 'private' })
  }
  return saveBlob(blob, keyOrOpts)
}
