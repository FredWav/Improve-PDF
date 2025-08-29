import { del, list, put, type PutBlobResult } from '@vercel/blob'

interface SaveBlobOptions {
  /**
   * Fournir directement la clé complète (ex: 'jobs/123/manifest.json')
   * Si 'key' est fourni, 'prefix' / 'filename' sont ignorés.
   */
  key?: string
  prefix?: string
  filename?: string
  /**
   * Par défaut true -> on ajoute un timestamp pour éviter les collisions.
   * Mettre false pour un chemin déterministe (manifest, etc.).
   */
  addTimestamp?: boolean
  access?: 'public' | 'private'
}

export async function saveBlob(
  file: File | Blob,
  opts?: SaveBlobOptions
): Promise<PutBlobResult> {
  let key: string
  if (opts?.key) {
    key = opts.key
  } else {
    const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/, '')
    const name =
      opts?.filename ??
      (file instanceof File ? file.name : `file-${Date.now()}.bin`)
    const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`
    key = `${prefix}${ts}${name}`
  }

  const res = await put(key, file, {
    access: opts?.access ?? 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  })
  return res
}

export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN })
}

export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
}

/**
 * Récupère un fichier (public ou privé) via fetch
 */
export async function getFile(urlOrPathname: string): Promise<Response> {
  const url = urlOrPathname.startsWith('http')
    ? urlOrPathname
    : `https://blob.vercel-storage.com/${urlOrPathname}`

  const headers: Record<string, string> = {}
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(
      `Erreur lors de la récupération du fichier: ${response.status} ${response.statusText}`
    )
  }

  return response
}

export async function getText(urlOrPathname: string): Promise<string> {
  const response = await getFile(urlOrPathname)
  return response.text()
}

export async function uploadText(
  text: string,
  opts?: Omit<SaveBlobOptions, 'filename'> & { filename?: string }
): Promise<PutBlobResult> {
  const blob = new Blob([text], { type: 'text/plain' })
  return saveBlob(blob, { ...opts })
}

export async function uploadJSON(
  data: any,
  opts?: Omit<SaveBlobOptions, 'filename'> & { filename?: string }
): Promise<PutBlobResult> {
  const jsonText = JSON.stringify(data)
  const blob = new Blob([jsonText], { type: 'application/json' })
  return saveBlob(blob, { ...opts })
}

export async function getJSON<T = any>(urlOrPathname: string): Promise<T> {
  const text = await getText(urlOrPathname)
  return JSON.parse(text) as T
}
