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

  console.log(`Saving blob with key: ${key}`)

  const putOptions: any = {
    access: opts?.access ?? 'public',
    token,
    // Force multipart for larger files and better consistency
    multipart: file.size > 5 * 1024 * 1024 // 5MB threshold
  }
  if (opts?.allowOverwrite) putOptions.addRandomSuffix = false
  if (opts?.addRandomSuffix) putOptions.addRandomSuffix = true

  let putResult: PutBlobResult
  try {
    putResult = await put(key, file, putOptions)
    console.log(`Blob saved successfully: ${putResult.url}`)
  } catch (err: any) {
    console.error(`Blob upload failed for key="${key}":`, err)
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

// Enhanced getFile with retry logic for eventual consistency
export async function getFile(pathOrUrl: string, maxRetries = 3): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl)
  const url = isFull
    ? pathOrUrl
    : `https://blob.vercel-storage.com/${pathOrUrl.replace(/^\/+/,'')}`

  const headers: Record<string, string> = {}
  const token =
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Fetching blob: ${url} (attempt ${attempt + 1}/${maxRetries})`)
      
      const res = await fetch(url, { 
        headers,
        cache: 'no-store', // Disable caching to get latest version
        // Add headers to bypass potential CDN caching
        ...{
          headers: {
            ...headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      })
      
      if (res.ok) {
        console.log(`Successfully fetched blob: ${url}`)
        return res
      }
      
      console.warn(`Blob fetch attempt ${attempt + 1} failed: ${res.status} ${res.statusText}`)
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
      
      // Wait before retrying, with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000) // 100ms, 200ms, 400ms, max 1s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (err: any) {
      console.warn(`Blob fetch attempt ${attempt + 1} error:`, err)
      lastError = err
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `Failed to fetch blob "${pathOrUrl}" after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

export async function getText(pathOrUrl: string): Promise<string> {
  const res = await getFile(pathOrUrl)
  return res.text()
}

export async function getJSON<T = any>(pathOrUrl: string): Promise<T> {
  const txt = await getText(pathOrUrl)
  try {
    return JSON.parse(txt) as T
  } catch (parseError) {
    console.error(`Failed to parse JSON from ${pathOrUrl}:`, parseError)
    throw new Error(`Invalid JSON in blob: ${pathOrUrl}`)
  }
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
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
  if (typeof keyOrOpts === 'string') {
    const result = await saveBlob(blob, { 
      key: keyOrOpts, 
      addTimestamp: false, 
      allowOverwrite: true 
    })
    
    // Verify the upload worked by attempting to read it back
    try {
      await getFile(result.pathname, 2) // Quick verification with 2 retries
      console.log(`Text upload verified: ${result.url}`)
    } catch (verifyError) {
      console.warn(`Text upload verification failed for ${result.url}:`, verifyError)
    }
    
    return result
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
  const json = JSON.stringify(data, null, 2) // Pretty format for debugging
  const blob = new Blob([json], { type: 'application/json; charset=utf-8' })
  
  if (typeof keyOrOpts === 'string') {
    const result = await saveBlob(blob, { 
      key: keyOrOpts, 
      addTimestamp: false, 
      allowOverwrite: true 
    })
    
    // Verify the JSON upload
    try {
      await getJSON(result.pathname) // This will also verify JSON parsing
      console.log(`JSON upload verified: ${result.url}`)
    } catch (verifyError) {
      console.warn(`JSON upload verification failed for ${result.url}:`, verifyError)
    }
    
    return result
  }
  return saveBlob(blob, keyOrOpts)
}
