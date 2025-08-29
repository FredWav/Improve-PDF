import { del, list, put, type PutBlobResult } from '@vercel/blob';
import { headers } from 'next/headers';

/**
 * Enregistre un fichier reçu (File/Blob) dans Vercel Blob.
 * - access: 'public' pour récupérer une URL publique
 * - token: recommandé côté serveur si ton store l'exige
 */
export async function saveBlob(
  file: File | Blob,
  opts?: { prefix?: string; filename?: string; access?: 'public' | 'private' }
): Promise<PutBlobResult> {
  const prefix = opts?.prefix ?? 'uploads/';
  const name = opts?.filename ?? (file instanceof File ? file.name : `file-${Date.now()}.bin`);
  const key = `${prefix}${Date.now()}-${name}`;

  const res = await put(key, file, {
    access: opts?.access ?? 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN // peut être omis si store public
  });

  return res; // { url, pathname, size, uploadedAt }
}

/**
 * Liste les blobs sous un préfixe.
 */
export async function listBlobs(prefix = 'uploads/') {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Supprime un blob par son URL ou son pathname.
 */
export async function deleteBlob(urlOrPathname: string) {
  return del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Récupère un fichier depuis Vercel Blob avec fetch
 */
export async function getFile(urlOrPathname: string): Promise<Response> {
  const url = urlOrPathname.startsWith('http') ? urlOrPathname : `https://blob.vercel-storage.com/${urlOrPathname}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération du fichier: ${response.statusText}`);
  }
  
  return response;
}

/**
 * Récupère un fichier texte depuis Vercel Blob et le retourne sous forme de string
 */
export async function getText(urlOrPathname: string): Promise<string> {
  const response = await getFile(urlOrPathname);
  return response.text();
}

/**
 * Télécharge du texte vers Vercel Blob
 */
export async function uploadText(
  text: string,
  opts?: { prefix?: string; filename?: string; access?: 'public' | 'private' }
): Promise<PutBlobResult> {
  const blob = new Blob([text], { type: 'text/plain' });
  const filename = opts?.filename ?? `text-${Date.now()}.txt`;
  return saveBlob(blob, { ...opts, filename });
}

/**
 * Télécharge du JSON vers Vercel Blob
 */
export async function uploadJSON(
  data: any,
  opts?: { prefix?: string; filename?: string; access?: 'public' | 'private' }
): Promise<PutBlobResult> {
  const jsonText = JSON.stringify(data);
  const blob = new Blob([jsonText], { type: 'application/json' });
  const filename = opts?.filename ?? `data-${Date.now()}.json`;
  return saveBlob(blob, { ...opts, filename });
}

/**
 * Récupère et parse un fichier JSON depuis Vercel Blob
 */
export async function getJSON<T = any>(urlOrPathname: string): Promise<T> {
  const text = await getText(urlOrPathname);
  return JSON.parse(text) as T;
}
