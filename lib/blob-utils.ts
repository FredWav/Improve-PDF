// lib/blob-utils.ts
import { uploadJSON } from './blob';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/** Attente en ms */
const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

/**
 * Exécute une opération avec retry + backoff.
 * Conserve le comportement d’origine, mais typé proprement.
 */
export const executeWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Collisions "already exists" → on retente (backoff)
      if ((message.includes('already exists') || message.includes('blob already exists')) && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt); // backoff exponentiel
        await wait(delay);
        continue;
      }
      // Autres erreurs → on relâche telles quelles
      throw error instanceof Error ? error : new Error(message);
    }
  }
  throw new Error('Operation failed after retries');
};

/**
 * Fonction attendue par lib/job-manager.ts
 * Sauvegarde JSON sur Vercel Blob avec overwrite autorisé + retry/backoff.
 * Ne change pas la signature existante.
 */
export const saveWithRetry = async (key: string, data: any) => {
  return executeWithRetry(async () => {
    // overwrite explicite pour éviter les 409 au 2e write du manifest
    return uploadJSON(data, { key, addTimestamp: false, allowOverwrite: true });
  });
};
