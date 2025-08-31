import { put, del, list, type PutBlobResult } from '@vercel/blob'

/**
 * Options for saving a blob to Vercel Blob.
 */
export interface SaveBlobOptions {
  /** Full key (pathname) to use. If provided, prefix/filename are ignored. */
  key?: string
  /** Prefix to prepend to the generated key (e.g., `uploads/`). Defaults to `uploads/`. */
  prefix?: string
  /** Base filename to use (e.g., `file.pdf`). Defaults to File.name or a generated one. */
  filename?: string
  /** When true, we add a millisecond timestamp in front of the filename to avoid collisions. Defaults to true. */
  addTimestamp?: boolean
  /** Access for the blob. We only use `public` in this project. */
  access?: 'public'
  /** Allow overwriting an existing key. */
  allowOverwrite?: boolean
  /** Force adding a random suffix to the pathname (useful for user uploads). */
  addRandomSuffix?: boolean
}

export interface StoredBlobResult extends PutBlobResult {
  size: number
  uploadedAt: string
}

/** Build a pathname for the blob. */
function buildKey (file: File | Blob, opts?: SaveBlobOptions): string {
  if (opts?.key) return opts.key.replace(/^\/+/, '')
  const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/, '')
  const baseName = opts?.filename ?? (file instanceof File ? file.name : `file-${Date.now()}.bin`)
  const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`
  return `${prefix}${ts}${baseName}`
}

/** Ensure we have the RW token at runtime. */
function requireReadWriteToken (): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'Missing BLOB_READ_WRITE_TOKEN environment variable. Create a Blob store in Vercel and add the token to your Project Settings.'
    )
  }
  return token
}

/**
 * Low-level save helper around `@vercel/blob/put`.
 * IMPORTANT: Correctly forwards allowOverwrite/addRandomSuffix to avoid 409 errors.
 */
export async function saveBlob (file: File | Blob, opts?: SaveBlobOptions): Promise<StoredBlobResult> {
  const key = buildKey(file, opts)
  const token = requireReadWriteToken()

  console.log(`Saving blob with key: ${key}, allowOverwrite: ${opts?.allowOverwrite === true}`)

  // Base SDK options
  const putOptions: any = {
    access: opts?.access ?? 'public',
    token,
    // Using multipart for larger files improves stability on Vercel Functions
    multipart: (file as any).size ? (file as any).size > 5 * 1024 * 1024 : false
  }

  // ---- CRITICAL FIX: actually pass allowOverwrite to the SDK ----
  if (opts?.allowOverwrite === true) {
    // Overwriting => never add a suffix
    putOptions.allowOverwrite = true
    putOptions.addRandomSuffix = false
  } else if (opts?.addRandomSuffix === true) {
    // No overwrite => disambiguate keys
    putOptions.addRandomSuffix = true
  }

  let putResult: PutBlobResult
  try {
    putResult = await put(key, file, putOptions)
    console.log(`Blob saved successfully: ${putResult.url}`)
  } catch (err: any) {
    console.error(`Blob upload failed for key="${key}":`, err)

    // If we hit an overwrite error but caller did not opt-in, do ONE retry with allowOverwrite=true.
    const message: string = err?.message || String(err)
    if (message.includes('already exists') && opts?.allowOverwrite !== true) {
      console.log(`Retrying blob save with allowOverwrite=true for key: ${key}`)
      try {
        putOptions.allowOverwrite = true
        putOptions.addRandomSuffix = false
        putResult = await put(key, file, putOptions)
        console.log(`Blob saved on retry with overwrite: ${putResult.url}`)
      } catch (retryErr: any) {
        throw new Error(
          `Blob upload failed for key="${key}" even with overwrite retry: ${retryErr?.message || String(retryErr)}`
        )
      }
    } else {
      throw new Error(`Blob upload failed for key="${key}": ${message}`)
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
export async function listBlobs (prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
}

/** Convenience: delete a blob by URL or pathname. */
export async function deleteBlob (urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
}

/**
 * Fetch a blob (by full URL or pathname) with small retry/backoff and no caching.
 * More robust: tries generic domain, then public host, then resolves via `list()` if needed.
 */
export async function getFile (pathOrUrl: string, maxRetries = 3): Promise<Response> {
  // Build all candidate URLs we can try
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const key = isFull ? pathOrUrl : pathOrUrl.replace(/^\/+/, '')

  // Candidate 1: as-is full URL (if already a URL)
  const candidates: string[] = []
  if (isFull) {
    candidates.push(key)
  } else {
    // Candidate 2: generic domain (works with proper Authorization for many setups)
    candidates.push(`https://blob.vercel-storage.com/${key}`)
    // Candidate 3: explicit public host if provided
    const publicHost = process.env.BLOB_PUBLIC_BASE_URL // e.g. jdjuok2idyn9orll.public.blob.vercel-storage.com
    if (publicHost) {
      candidates.push(`https://${publicHost}/${key}`)
    }
  }

  const headers: Record<string, string> = {}
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Try each candidate with small retries before falling back to list()
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

  // Last resort: resolve the public URL via list() (only when we had a pathname)
  if (!isFull) {
    try {
      const l = await list({
        prefix: key,
        token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN,
      })
      const hit = l.blobs?.find(b => b.pathname === key) || l.blobs?.[0]
      if (hit?.url) {
        console.log(`Resolved blob URL via list(): ${hit.url}`)
        const res = await fetch(hit.url, { cache: 'no-store' })
        if (res.ok) return res
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
      } else {
        lastError = new Error(`Blob not found via list() for prefix "${key}"`)
      }
    } catch (e) {
      lastError = e
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown fetch error')))
}

/** Upload a JSON-serializable object to Blob. */
export async function uploadJSON (data: any, keyOrOpts: string | (SaveBlobOptions & { key?: string })) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json; charset=utf-8' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}

/** GET and parse JSON from Blob. */
export async function getJSON<T = any> (pathOrUrl: string, maxRetries = 3): Promise<T> {
  const res = await getFile(pathOrUrl, maxRetries)
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch (err) {
    console.error('Failed to parse JSON from blob at', pathOrUrl, '— raw:', text.slice(0, 200))
    throw err
  }
}

/** Upload a UTF-8 text content to Blob. */
export async function uploadText (text: string, keyOrOpts: string | (SaveBlobOptions & { key?: string })) {
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true })
  }
  return saveBlob(blob, keyOrOpts)
}
