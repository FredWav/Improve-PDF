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
 * - crée le job + manifest
 * - vérifie que le manifest est lisible
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

    // 1) Crée un id et un manifest initial
    const id = generateJobId();
    console.log(`[Queue] Creating job ${id} with fileKey: ${fileKey}`);

    await createJobStatus(id, {
      id,
      filename,
      inputFile: fileKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

    await saveJobStatus({
      id,
      filename,
      inputFile: fileKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

    // 2) Vérifie qu'on peut relire le manifest immédiatement
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

    // 3) Déclenche EXTRACT **sans AbortSignal.timeout** (cause des TimeoutError)
    try {
      const nextURL = new URL('/api/jobs/extract', req.url);
      console.log(`Attempting to trigger extract for job ${id}`);

      // On attend la réponse (maxDuration=60 côté route suffit), pas de timeout custom
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
      // On loggue en warn mais on **ne bloque pas** l’enqueue
      try {
        await addJobLog(id, 'warn', `Extract auto-trigger error: ${e?.message || String(e)}`);
      } catch {}
    }

    return NextResponse.json(
      {
        jobId: id,
        status: 'ok',
        message: 'Job created; extract triggered',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Enqueue error:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Internal error',
      },
      { status: 500 }
    );
  }
}
