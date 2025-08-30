
import { put, del, list, head } from '@vercel/blob'

export type SaveBlobOptions = {
  key?: string
  prefix?: string
  filename?: string
  addTimestamp?: boolean
  access?: 'public'
  allowOverwrite?: boolean
  addRandomSuffix?: boolean
}

export type StoredBlobResult = {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

function buildKey(opts: SaveBlobOptions = {}): string {
  const parts = []
  if (opts.prefix) parts.push(opts.prefix.replace(/^\/+|\/+$/g, ''))
  let name = opts.filename || 'file'
  if (opts.addTimestamp !== false) {
    const ts = new Date().toISOString().replace(/[:.]/g,'-')
    name = `${name}-${ts}`
  }
  if (opts.addRandomSuffix) {
    const rnd = Math.random().toString(36).slice(2,8)
    name = `${name}-${rnd}`
  }
  parts.push(name)
  return parts.join('/')
}

export async function saveBlob(blob: Blob, opts: SaveBlobOptions = {}): Promise<StoredBlobResult> {
  const key = opts.key || buildKey(opts)
  const res = await put(key, blob, {
    access: opts.access || 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    contentType: (blob as any).type || 'application/octet-stream',
  })
  return { url: res.url, pathname: res.pathname, size: (blob as any).size ?? 0, uploadedAt: new Date().toISOString() }
}

export async function uploadFile(file: File, opts: SaveBlobOptions = {}) {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' })
  const filename = file.name || opts.filename
  return saveBlob(blob, { ...opts, filename })
}

export async function uploadText(text: string, opts: SaveBlobOptions = {}) {
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
  return saveBlob(blob, opts)
}

export async function uploadJSON(data: any, opts: SaveBlobOptions = {}) {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  return saveBlob(blob, opts)
}

export async function getJSON<T=any>(key: string): Promise<T> {
  const url = `https://blob.vercel-storage.com/${encodeURI(key)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN}` }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Blob GET failed: ${res.status}`)
  return await res.json() as T
}

export async function remove(key: string) {
  await del(`https://blob.vercel-storage.com/${encodeURI(key)}`, { token: process.env.BLOB_READ_WRITE_TOKEN })
}

export async function exists(key: string): Promise<boolean> {
  try {
    const h = await head(`https://blob.vercel-storage.com/${encodeURI(key)}`, { token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
    return !!h
  } catch {
    return false
  }
}

export async function listPrefix(prefix: string) {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN })
}
