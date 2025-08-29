// lib/blob.ts
import { del, list, put, type PutBlobResult } from '@vercel/blob';

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
