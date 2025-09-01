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

/** Construit une clé stable. Si prefix/filename sont fournis, on concatène. */
function buildKey(file: File | Blob, opts?: SaveBlobOptions): string {
  if (opts?.key) return opts.key.replace(/^\//, '');
  const name = (opts?.filename || 'file').replace(/^\//, '');
  const prefix = (opts?.prefix || '').replace(/^\/*|\/*$/g, '');
  const ts = opts?.addTimestamp ? `-${Date.now()}` : '';
  const base = `${name}${ts}`;
  return prefix ? `${prefix}/${base}` : base;
}

/** Récupère le token RW (obligatoire côté serveur) */
function requireReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN environment variable. Configure Vercel Blob in Project Settings.');
  }
  return token;
}

/** Upload générique vers Vercel Blob. Public par défaut. */
export async function saveBlob(file: File | Blob, opts?: SaveBlobOptions): Promise<StoredBlobResult> {
  const key = buildKey(file, opts);
  const token = requireReadWriteToken();

  const size = (file as any)?.size ?? 0;
  const putOptions: any = {
    access: opts?.access ?? 'public',
    token,
    multipart: size > 5 * 1024 * 1024, // multipart si > 5Mo
  };

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
export async function listBlobs(prefix: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN;
  return list({ prefix, token });
}

/** Suppression d'un blob (clé exacte) */
export async function deleteBlob(key: string) {
  const token = requireReadWriteToken();
  await del(key, { token });
}

/** Résout un path 'jobs/..' en URL publique robuste, puis fait le fetch avec retries. */
async function fetchOrResolveBlob(pathOrUrl: string, maxRetries = 8): Promise<Response> {
  const isFull = /^https?:\/\//i.test(pathOrUrl);
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN;

  const tryFetch = async (url: string) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        });
        if (res.ok) return res;
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      } catch (e) {
        lastError = e;
      }
      // backoff progressif
      if (attempt < maxRetries - 1) {
        const delay = Math.min(250 * Math.pow(2, attempt), 2000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown fetch error'));
  };

  // 1) URL complète
  if (isFull) return tryFetch(pathOrUrl);

  // 2) Hôte public connu
  const key = pathOrUrl.replace(/^\//, '');
  const publicHost = process.env.BLOB_PUBLIC_BASE_URL; // ex: xxx.public.blob.vercel-storage.com
  if (publicHost) {
    try {
      return await tryFetch(`https://${publicHost}/${key}`);
    } catch { /* fallback */ }
  }

  // 3) Résolution via list() (plus fiable si token dispo)
  try {
    const out = await list({ prefix: key, token });
    const hit: any = (out as any)?.blobs?.find((b: any) => b.pathname === key);
    if (hit?.url) {
      return await tryFetch(hit.url);
    }
  } catch { /* fallback */ }

  // 4) Domaine générique (peut ne pas marcher selon le bucket)
  return await tryFetch(`https://blob.vercel-storage.com/${key}`);
}

/** Télécharge un fichier brut (Response) */
export async function getFile(pathOrUrl: string, maxRetries = 8): Promise<Response> {
  return fetchOrResolveBlob(pathOrUrl, maxRetries);
}

/** GET + parse JSON */
export async function getJSON<T = any>(pathOrUrl: string, maxRetries = 8): Promise<T> {
  const res = await fetchOrResolveBlob(pathOrUrl, maxRetries);
  return (await res.json()) as T;
}

/** GET + return raw text */
export async function getText(pathOrUrl: string, maxRetries = 8): Promise<string> {
  const res = await fetchOrResolveBlob(pathOrUrl, maxRetries);
  return await res.text();
}

/** Upload JSON */
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
