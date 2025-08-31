import { put, del, list, type PutBlobResult } from '@vercel/blob';

export interface SaveBlobOptions {
  key?: string;
  prefix?: string;
  filename?: string;
  addTimestamp?: boolean;
  access?: 'public';
  allowOverwrite?: boolean;
  addRandomSuffix?: boolean;
}

export interface StoredBlobResult extends PutBlobResult {
  size: number;
  uploadedAt: string;
}

/** Construit la clé (pathname) */
function buildKey(file: File | Blob, opts?: SaveBlobOptions): string {
  if (opts?.key) return opts.key.replace(/^\/+/, '');
  const prefix = (opts?.prefix ?? 'uploads/').replace(/^\/+/, '');
  const baseName = opts?.filename ?? (file instanceof File ? file.name : `file-${Date.now()}.bin`);
  const ts = opts?.addTimestamp === false ? '' : `${Date.now()}-`;
  return `${prefix}${ts}${baseName}`;
}

/** Récupère le token RW (obligatoire côté serveur) */
function requireReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'Missing BLOB_READ_WRITE_TOKEN environment variable. Add your Vercel Blob token in Project Settings.'
    );
  }
  return token;
}

/**
 * Upload vers Vercel Blob.
 * Important : on transmet bien allowOverwrite à put() si demandé.
 */
export async function saveBlob(file: File | Blob, opts?: SaveBlobOptions): Promise<StoredBlobResult> {
  const key = buildKey(file, opts);
  const token = requireReadWriteToken();

  const size = (file as any)?.size ?? 0;
  const putOptions: any = {
    access: opts?.access ?? 'public',
    token,
    multipart: size > 5 * 1024 * 1024 // plus stable si > 5 Mo
  };

  // Transmission correcte des options d’unicité
  if (opts?.allowOverwrite === true) {
    putOptions.allowOverwrite = true;
    putOptions.addRandomSuffix = false;
  } else if (opts?.addRandomSuffix === true) {
    putOptions.addRandomSuffix = true;
  }

  let putResult: PutBlobResult;
  try {
    putResult = await put(key, file, putOptions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Collision non prévue → 1 retry en overwrite
    if (message.includes('already exists') && opts?.allowOverwrite !== true) {
      putOptions.allowOverwrite = true;
      putOptions.addRandomSuffix = false;
      putResult = await put(key, file, putOptions);
    } else {
      throw new Error(`Blob upload failed for key="${key}": ${message}`);
    }
  }

  const uploadedAt =
    (putResult as any).uploadedAt
      ? new Date((putResult as any).uploadedAt).toISOString()
      : new Date().toISOString();

  return { ...putResult, size, uploadedAt };
}

/** Liste les blobs par préfixe */
export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN });
}

/** Supprime un blob par URL ou pathname */
export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN });
}

/**
 * Lecture robuste d’un blob (URL complète ou pathname) avec retries.
 * Tente d’abord l’hôte public (ENV BLOB_PUBLIC_BASE_URL), puis le domaine générique.
 */
export async function getFile(pathOrUrl: string, maxRetries = 6): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl);
  const key = isFull ? pathOrUrl : pathOrUrl.replace(/^\/+/, '');

  // 1) si URL complète → on la lit telle quelle
  if (isFull) {
    return doFetchWithRetries(key, maxRetries);
  }

  // 2) sinon, on essaie d’abord l’hôte public (là où tu viens d’écrire)
  const publicHost = process.env.BLOB_PUBLIC_BASE_URL; // ex: jdjuok2idyn9orll.public.blob.vercel-storage.com
  const candidates: string[] = [];
  if (publicHost) candidates.push(`https://${publicHost}/${key}`);

  // 3) puis le domaine générique
  candidates.push(`https://blob.vercel-storage.com/${key}`);

  let lastErr: unknown = null;
  for (const url of candidates) {
    try {
      const res = await doFetchWithRetries(url, maxRetries);
      return res;
    } catch (e) {
      lastErr = e;
      // on continue sur le candidat suivant
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'Unknown fetch error'));
}

/** GET + parse JSON */
export async function getJSON<T = any>(pathOrUrl: string, maxRetries = 6): Promise<T> {
  const res = await getFile(pathOrUrl, maxRetries);
  const text = await res.text();
  return JSON.parse(text) as T;
}

/** Upload d’un objet JSON */
export async function uploadJSON(
  data: any,
  keyOrOpts: string | (SaveBlobOptions & { key?: string })
) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json; charset=utf-8' });
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true });
  }
  return saveBlob(blob, keyOrOpts);
}

/** Upload de texte brut */
export async function uploadText(
  text: string,
  keyOrOpts: string | (SaveBlobOptions & { key?: string })
) {
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
  if (typeof keyOrOpts === 'string') {
    return saveBlob(blob, { key: keyOrOpts, addTimestamp: false, allowOverwrite: true });
  }
  return saveBlob(blob, keyOrOpts);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

async function doFetchWithRetries(url: string, maxRetries: number): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...headers, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        cache: 'no-store'
      });
      if (res.ok) return res;

      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(150 * Math.pow(2, attempt), 2000); // petit backoff
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(150 * Math.pow(2, attempt), 2000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown fetch error'));
}
