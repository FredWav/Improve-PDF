export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { loadJobStatus } from '@/lib/status';
import { getJSON } from '@/lib/blob';

type Params = { params: { id?: string } };

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(_req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: noStore });
  }

  try {
    // Lecture robuste via lib/status (préférée)
    const job = await loadJobStatus(id);
    if (job) {
      (job as any).id = id;
      return NextResponse.json(job, { status: 200, headers: noStore });
    }

    // Fallback direct sur le blob si jamais loadJobStatus renvoie null
    const key = `jobs/${id}/manifest.json`;
    try {
      const manifest = await getJSON<any>(key, 8);
      if (manifest && typeof manifest === 'object') {
        (manifest as any).id = id;
        return NextResponse.json(manifest, { status: 200, headers: noStore });
      }
    } catch {
      /* ignore and fall through */
    }

    return NextResponse.json({ error: 'Job not found', id }, { status: 404, headers: noStore });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load job status', id },
      { status: 500, headers: noStore }
    );
  }
}
