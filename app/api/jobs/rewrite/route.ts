export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
  loadJobStatus,
} from '@/lib/status';
import { splitMarkdownByHeadings, joinSections, type Section } from '@/lib/text';
import { getText } from '@/lib/blob';
import { rewriteSectionStrict } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { id, stylePreset } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await updateStepStatus(id, 'rewrite', 'RUNNING', 'Début réécriture');
    await addJobLog(id, 'info', 'Réécriture assistée IA (conservation du contenu)');

    // Charge directement le manifest (pas d’appel HTTP à /api/status)
    const job = await loadJobStatus(id);
    if (!job) {
      await updateStepStatus(id, 'rewrite', 'FAILED', 'Job introuvable');
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const normalizedUrl: string | undefined = job.outputs?.normalizedText;
    if (!normalizedUrl) {
      await updateStepStatus(id, 'rewrite', 'FAILED', 'normalizedText manquant');
      return NextResponse.json({ error: 'normalizedText not found in outputs' }, { status: 400 });
    }

    // Récupère le Markdown normalisé depuis Blob (résolution robuste via token/list)
    const normalizedMd = await getText(normalizedUrl);

    const sections = splitMarkdownByHeadings(normalizedMd);
    const rewritten: Section[] = [];

    for (const sec of sections) {
      const out = await rewriteSectionStrict(sec.content, { stylePreset });
      rewritten.push({ ...sec, content: out || sec.content });
    }

    const map = sections.map((s, i) => ({
      id: s.id,
      heading: s.heading,
      beforeWords: (s.content.match(/\S+/g) || []).length,
      afterWords: (rewritten[i].content.match(/\S+/g) || []).length,
    }));

    const rewrittenMd = joinSections(rewritten);
    const mapUrl = await saveProcessingData(id, 'rewrite', JSON.stringify(map, null, 2), 'map.json');
    const mdUrl = await saveProcessingData(id, 'rewrite', rewrittenMd, 'rewritten.md');

    await addJobOutput(id, 'rewrittenText', mdUrl);
    await addJobLog(id, 'info', `Réécriture terminée — ${rewritten.length} sections traitées`);
    await updateStepStatus(id, 'rewrite', 'COMPLETED', 'Réécriture terminée');

    // Enchaîne images (fire-and-forget)
    try {
      const nextURL = new URL('/api/jobs/images', req.url);
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      });
    } catch { /* non-bloquant */ }

    return NextResponse.json({ ok: true, mdUrl, mapUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'rewrite failed' }, { status: 500 });
  }
}
