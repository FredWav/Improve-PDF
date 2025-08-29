import { put, del, list, head } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadFile(file: File | Buffer, filename: string): Promise<{ url: string; pathname: string }> {
  const blob = await put(filename, file as any, {
    access: 'public',
  })
  
  return {
    url: blob.url,
    pathname: blob.pathname,
  }
}

/**
 * Upload text content as a file to Vercel Blob storage
 */
export async function uploadText(content: string, filename: string): Promise<{ url: string; pathname: string }> {
  const blob = await put(filename, content, {
    access: 'public',
    contentType: 'text/plain',
  })
  
  return {
    url: blob.url,
    pathname: blob.pathname,
  }
}

/**
 * Upload JSON content as a file to Vercel Blob storage
 */
export async function uploadJSON(data: any, filename: string): Promise<{ url: string; pathname: string }> {
  const blob = await put(filename, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  })
  
  return {
    url: blob.url,
    pathname: blob.pathname,
  }
}

/**
 * Get a file from Vercel Blob storage
 */
export async function getFile(url: string): Promise<Response> {
  return fetch(url)
}

/**
 * Get text content from a blob URL
 */
export async function getText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch text: ${response.statusText}`)
  }
  return response.text()
}

/**
 * Get JSON content from a blob URL
 */
export async function getJSON<T = any>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url)
}

/**
 * List files with a specific prefix
 */
export async function listFiles(prefix?: string, options?: { limit?: number; cursor?: string }) {
  return list({
    prefix,
    limit: options?.limit || 100,
    cursor: options?.cursor,
  })
}

/**
 * Check if a file exists
 */
export async function fileExists(url: string): Promise<boolean> {
  try {
    await head(url)
    return true
  } catch {
    return false
  }
}

/**
 * Generate a signed URL for private access (if needed)
 */
export async function getSignedUrl(pathname: string, expiresIn = 3600): Promise<string> {
  // For now, return the public URL as Vercel Blob doesn't require signing for public access
  // This can be extended if private blob access is needed
  return `https://blob.vercel-storage.com/${pathname}`
}

/**
 * Helper to create a unique filename with timestamp
 */
export function createUniqueFilename(originalName: string, jobId?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split('.').pop()
  const baseName = originalName.split('.').slice(0, -1).join('.')
  
  if (jobId) {
    return `${jobId}/${timestamp}-${random}-${baseName}.${ext}`
  }
  
  return `${timestamp}-${random}-${baseName}.${ext}`
}

/**
 * Helper to get file extension from a filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Helper to validate file type
 */
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const ext = getFileExtension(filename)
  return allowedTypes.includes(ext)
}