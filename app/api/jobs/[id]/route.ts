// app/api/status/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { loadJobStatus } from '@/lib/status';
import { getJSON } from '@/lib/blob';

type Params = { params: { id?: string } };

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

// Endpoint de statut robuste : lit le manifest via loadJobStatus(id) (token + list()),
// et ne renvoie 404 que s’il n’existe vraiment pas.
// On garde un fallback getJSON(key) si jamais loadJobStatus change de logique.
export async function GET(_req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: noStore });
  }

  try {
    // 1) lecture robuste via lib/status (utilise blob + token)
    const job = await loadJobStatus(id);
    if (job) {
      (job as any).id = id;
      return NextResponse.json(job, { status: 200, headers: noStore });
    }

    // 2) Fallback prudent : accès direct au manifest s’il existe
    const key = `jobs/${id}/manifest.json`;
    try {
      const manifest = await getJSON<any>(key, 8);
      if (manifest && typeof manifest === 'object') {
        (manifest as any).id = id;
        return NextResponse.json(manifest, { status: 200, headers: noStore });
      }
    } catch {
      /* on tente la suite */
    }

    return NextResponse.json({ error: 'Job not found', id }, { status: 404, headers: noStore });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load job status', id },
      { status: 500, headers: noStore },
    );
  }
}
