import { del, list, put, type PutBlobResult } from '@vercel/blob'

/**
 * Options internes pour sauvegarde d'un blob.
 * key => chemin complet (ex: jobs/123/outputs/file.txt)
 * prefix + filename => chemin construit
 * addTimestamp => insère ou non un préfixe de type date pour éviter collisions
 */
export interface SaveBlobOptions {
  key?: string
  prefix?: string
  filename?: string
  addTimestamp?: boolean
  access?: 'public' | 'private'
}

/**
 * Sauvegarde générique d'un Blob / File dans Vercel Blob Storage.
 */
export async function saveBlob(
  file: File | Blob,
  opts?: SaveBlobOptions
): Promise<PutBlobResult> {
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

  return put(key, file, {
    access: opts?.access ?? 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  })
}

/**
 * Liste des blobs sous un préfixe.
 */
export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN })
}

/**
 * Suppression d'un blob par URL ou pathname.
 */
export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
}

/**
 * Récupère un fichier via fetch (support chemin relatif ou URL complète).
 */
export async function getFile(pathOrUrl: string): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const url = isFull ? pathOrUrl : `https://blob.vercel-storage.com/${pathOrUrl.replace(/^\/+/, '')}`

  const headers: Record<string, string> = {}
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Failed to fetch blob ${pathOrUrl}: ${res.status} ${res.statusText}`)
  }
  return res
}

/**
 * Récupère le texte d'un blob.
 */
export async function getText(pathOrUrl: string): Promise<string> {
  const res = await getFile(pathOrUrl)
  return res.text()
}

/**
 * Récupère puis parse du JSON.
 */
export async function getJSON<T = any>(pathOrUrl: string): Promise<T> {
  const txt = await getText(pathOrUrl)
  return JSON.parse(txt) as T
}

/* =======================
 * Surcharges uploadText
 * ======================= */
export async function uploadText(text: string, key: string): Promise<PutBlobResult>
export async function uploadText(text: string, opts?: SaveBlobOptions): Promise<PutBlobResult>
export async function uploadText(
  text: string,
  keyOrOpts?: string | SaveBlobOptions
): Promise<PutBlobResult> {
  const blob = new Blob([text], { type: 'text/plain' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, access: 'private' })
  }
  return saveBlob(blob, keyOrOpts)
}

/* =======================
 * Surcharges uploadJSON
 * ======================= */
export async function uploadJSON(data: any, key: string): Promise<PutBlobResult>
export async function uploadJSON(data: any, opts?: SaveBlobOptions): Promise<PutBlobResult>
export async function uploadJSON(
  data: any,
  keyOrOpts?: string | SaveBlobOptions
): Promise<PutBlobResult> {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, access: 'private' })
  }
  return saveBlob(blob, keyOrOpts)
}
