export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import {
  generateJobId,
  createJobStatus,
  saveJobStatus,
  loadJobStatus,
  addJobLog,
} from '@/lib/status';

/**
 * POST /api/enqueue
 * body: { fileKey: string, filename: string }
 * - crée le job (manifest minimal)
 * - sauvegarde le manifest complet
 * - vérifie la lecture immédiate
 * - déclenche /api/jobs/extract **sans timeout artificiel**
 * - renvoie { jobId }
 */
export async function POST(req: Request) {
  try {
    const { fileKey, filename } = await req.json().catch(() => ({} as any));
    if (!fileKey || !filename) {
      return NextResponse.json(
        { error: 'fileKey and filename are required' },
        { status: 400 }
      );
    }

    // 1) Crée un id et un manifest minimal
    const id = generateJobId();
    console.log(`[Queue] Creating job ${id} with fileKey: ${fileKey}`);

    // IMPORTANT: ta signature attend uniquement l’ID
    await createJobStatus(id);

    // 2) Écrit le manifest complet
    const now = new Date().toISOString();
    await saveJobStatus({
      id,
      filename,
      inputFile: fileKey,
      createdAt: now,
      updatedAt: now,
      steps: {
        extract: 'PENDING',
        normalize: 'PENDING',
        rewrite: 'PENDING',
        images: 'PENDING',
        render: 'PENDING',
      },
      outputs: {},
      logs: [],
    });

    // 3) Vérifie qu'on peut relire le manifest immédiatement
    const readable = await loadJobStatus(id);
    if (!readable) {
      console.warn(`[Queue] Manifest not immediately readable for ${id}`);
      return NextResponse.json(
        {
          jobId: id,
          status: 'accepted',
          note: 'Job created; manifest not yet readable — retry status soon',
        },
        { status: 202 }
      );
    }

    // 4) Déclenche EXTRACT **sans AbortSignal.timeout**
    try {
      const nextURL = new URL('/api/jobs/extract', req.url);
      console.log(`Attempting to trigger extract for job ${id}`);

      const resp = await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => resp.statusText);
        console.warn(`Extract kickoff returned ${resp.status}: ${msg}`);
        await addJobLog(id, 'warn', `Extract kickoff returned ${resp.status}: ${msg}`);
      } else {
        await addJobLog(id, 'info', 'Extract kickoff OK');
      }
    } catch (e: any) {
      console.warn(`Extract auto-trigger error for ${id}: ${e?.message || e}`);
      try {
        await addJobLog(id, 'warn', `Extract auto-trigger error: ${e?.message || String(e)}`);
      } catch {}
    }

    return NextResponse.json(
      { jobId: id, status: 'ok', message: 'Job created; extract triggered' },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Enqueue error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
