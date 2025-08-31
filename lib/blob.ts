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

/** Build a pathname for the blob. */
function buildKey(file: File | Blob, opts?: SaveBlobOptions): string {
  if (opts?.key) return opts.key.replace(/^\/+/, '')
  const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/, '')
  const baseName = opts?.filename ?? (file instanceof File ? file.name : `file-${Date.now()}.bin`)
  const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`
  return `${prefix}${ts}${baseName}`
}

/** Ensure we have the RW token at runtime. */
function requireReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'Missing BLOB_READ_WRITE_TOKEN environment variable. Create a Blob store in Vercel and add the token to your project settings.'
    )
  }
  return token
}

/**
 * Save a blob to Vercel Blob.
 * IMPORTANT: on passe bien allowOverwrite à put(), sinon 409 "already exists".
 */
export async function saveBlob(
  file: File | Blob,
  opts?: SaveBlobOptions
): Promise<StoredBlobResult> {
  const key = buildKey(file, opts)
  const token = requireReadWriteToken()

  console.log(`Saving blob with key: ${key}, allowOverwrite: ${opts?.allowOverwrite}`)

  const putOptions: any = {
    access: opts?.access ?? 'public',
    token,
    // multipart conseillé pour les gros fichiers
    multipart: (file as any).size ? (file as any).size > 5 * 1024 * 1024 : false
  }

  // ⬇️ Correctif critique : on transmet allowOverwrite au SDK
  if (opts?.allowOverwrite === true) {
    // en overwrite, on ne veut pas de suffixe aléatoire
    putOptions.addRandomSuffix = false
    putOptions.allowOverwrite = true
  } else if (opts?.addRandomSuffix === true) {
    putOptions.addRandomSuffix = true
  }

  let putResult: PutBlobResult
  try {
    putResult = await put(key, file, putOptions)
    console.log(`Blob saved successfully: ${putResult.url}`)
  } catch (err: any) {
    console.error(`Blob upload failed for key="${key}":`, err)

    // Collision non prévue : on retente 1 fois en overwrite
    if (err?.message?.includes('already exists') && opts?.allowOverwrite !== true) {
      console.log(`Retrying blob save with allowOverwrite for key: ${key}`)
      try {
        putOptions.allowOverwrite = true
        putOptions.addRandomSuffix = false
        putResult = await put(key, file, putOptions)
        console.log(`Blob saved on retry: ${putResult.url}`)
      } catch (retryErr: any) {
        throw new Error(
          `Blob upload failed for key="${key}" even with retry: ${retryErr?.message || String(retryErr)}`
        )
      }
    } else {
      throw new Error(`Blob upload failed for key="${key}": ${err?.message || String(err)}`)
    }
  }

  const size = (file as any).size ?? 0
  const uploadedAt =
    (putResult as any).uploadedAt
      ? new Date((putResult as any).uploadedAt).toISOString()
      : new Date().toISOString()

  return { ...putResult, size, uploadedAt }
}

/** Convenience: list blobs by prefix. */
export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
}

/** Convenience: delete a blob by URL or pathname. */
export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
}

/**
 * GET a blob (URL complet ou pathname) avec petits retries et no-cache.
 * Tente le domaine générique puis (si défini) l’hôte public BLOB_PUBLIC_BASE_URL.
 */
export async function getFile(pathOrUrl: string, maxRetries = 3): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const key = isFull ? pathOrUrl : pathOrUrl.replace(/^\/+/, '')

  const candidates: string[] = []
  if (isFull) {
    candidates.push(key)
  } else {
    candidates.push(`https://blob.vercel-storage.com/${key}`)
    const publicHost = process.env.BLOB_PUBLIC_BASE_URL // ex: jdjuok2idyn9orll.public.blob.vercel-storage.com
    if (publicHost) {
      candidates.push(`https://${publicHost}/${key}`)
    }
  }

  const headers: Record<string, string> = {}
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`

  let lastError: any = null
  for (const url of candidates) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Fetching blob: ${url} (attempt ${attempt + 1}/${maxRetries})`)
        const res = await fetch(url, {
          headers: { ...headers, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          cache: 'no-store'
        })
        if (res.ok) return res

        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
        console.warn(`Blob fetch attempt ${attempt + 1} failed: ${res.status} ${res.statusText}`)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000)
          await new Promise(r => setTimeout(r, delay))
        }
      } catch (err) {
        lastError = err
        console.warn(`Blob fetch attempt ${attempt + 1} error:`, err)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown fetch error')))
}

/** Upload JSON pratique. */
export async function uploadJSON(
  data: any,
  keyOrOpts: string | (SaveBlobOptions & { key?: string })
) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json; charset=utf-8' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}

/** GET + parse JSON pratique. */
export async function getJSON<T = any>(pathOrUrl: string, maxRetries = 3): Promise<T> {
  const res = await getFile(pathOrUrl, maxRetries)
  const text = await res.text()
  return JSON.parse(text) as T
}

/** Upload texte pratique. */
export async function uploadText(
  text: string,
  keyOrOpts: string | (SaveBlobOptions & { key?: string })
) {
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}
