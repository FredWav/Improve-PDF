export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { loadJobStatus } from '@/lib/status';

type Params = { params: { id?: string } };

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(_req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { error: 'Missing id' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const job = await loadJobStatus(id);
    if (!job) {
      // Job pas encore prêt : on renvoie 404 (comportement attendu par le front existant)
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404, headers: noStoreHeaders }
      );
    }
    // OK : on renvoie le manifest complet
    return NextResponse.json(job, { status: 200, headers: noStoreHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load job status' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
