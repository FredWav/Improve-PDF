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
import { rewriteSectionStrict } from '@/lib/ai-rewrite';

type StylePreset =
  | 'sobre'
  | 'pédagogique'
  | 'copywriter'
  | 'neutre'
  | 'journalistique';

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const { id, stylePreset }: { id?: string; stylePreset?: StylePreset } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      await updateStepStatus(id, 'rewrite', 'FAILED', 'OPENAI_API_KEY manquant');
      await addJobLog(id, 'error', 'OPENAI_API_KEY manquant dans les variables d’environnement Vercel');
      return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });
    }

    await updateStepStatus(id, 'rewrite', 'RUNNING', 'Début réécriture');
    await addJobLog(id, 'info', `Réécriture IA — preset="${stylePreset || 'neutre'}"`);

    // Charge le manifest en mémoire (pas d’aller-retour HTTP)
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

    // Récupère le Markdown normalisé depuis Blob (résolution robuste)
    const normalizedMd = await getText(normalizedUrl);

    // Découpe par titres
    const sections = splitMarkdownByHeadings(normalizedMd);
    if (!sections.length) {
      await addJobLog(id, 'warning', 'Aucune section détectée. Réécriture sautée, on conserve le texte.');
      const mdUrl = await saveProcessingData(id, 'rewrite', normalizedMd, 'rewritten.md');
      await addJobOutput(id, 'rewrittenText', mdUrl);
      await updateStepStatus(id, 'rewrite', 'COMPLETED', 'Aucune section — texte conservé');
      return NextResponse.json({ ok: true, mdUrl }, { status: 200 });
    }

    const rewritten: Section[] = [];
    let okCount = 0;
    let failCount = 0;

    // Traite section par section avec retry & fallback
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const words = (sec.content.match(/\S+/g) || []).length;
      await addJobLog(id, 'fetch', `Réécriture section #${i + 1}/${sections.length} (${words} mots)`);

      try {
        const out = await rewriteSectionStrict(sec.content, {
          stylePreset: stylePreset || 'neutre',
          // bornes prudentes pour éviter les 413 / 400 context
          maxInputChars: 12000,
          maxOutputTokens: 900,
          retries: 4,
        });

        const cleaned = out?.trim();
        if (cleaned && cleaned.length > 0) {
          rewritten.push({ ...sec, content: cleaned });
          okCount++;
          await addJobLog(id, 'info', `OK section #${i + 1}`);
        } else {
          // Fallback sur contenu original
          rewritten.push({ ...sec, content: sec.content });
          failCount++;
          await addJobLog(
            id,
            'warning',
            `Section #${i + 1} renvoyée vide par l’IA — on conserve le texte original.`,
          );
        }
      } catch (e: any) {
        rewritten.push({ ...sec, content: sec.content });
        failCount++;
        await addJobLog(
          id,
          'error',
          `Échec IA section #${i + 1}: ${e?.message || e}`,
        );
      }
    }

    // Carte avant/après
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

    const took = Math.round((Date.now() - startedAt) / 1000);
    if (failCount > 0 && okCount === 0) {
      await updateStepStatus(
        id,
        'rewrite',
        'COMPLETED',
        `Réécriture sautée (fallback). ${failCount} section(s) conservée(s) telle(s) quelle(s)).`,
      );
      await addJobLog(
        id,
        'warning',
        `Aucune section réécrite par l’IA. Tout a été conservé. Durée ${took}s.`,
      );
    } else if (failCount > 0) {
      await updateStepStatus(
        id,
        'rewrite',
        'COMPLETED',
        `Réécriture partielle: ${okCount} ok / ${failCount} fallback. Durée ${took}s`,
      );
      await addJobLog(
        id,
        'warning',
        `Certaines sections ont échoué, texte original conservé pour celles-ci.`,
      );
    } else {
      await updateStepStatus(id, 'rewrite', 'COMPLETED', `Réécriture terminée (${okCount} sections). Durée ${took}s`);
      await addJobLog(id, 'info', `Réécriture complète réussie en ${took}s`);
    }

    // Enchaîne les images de façon non bloquante
    try {
      const nextURL = new URL('/api/jobs/images', req.url);
      fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      }).catch(() => void 0);
    } catch {
      /* non-bloquant */
    }

    return NextResponse.json({ ok: true, mdUrl, mapUrl }, { status: 200 });
  } catch (e: any) {
    // Échec “global” (avant génération de fichiers) → statut FAILED, logs explicites
    const msg = e?.message || 'rewrite failed';
    try {
      const { id } = await req.json().catch(() => ({ id: undefined }));
      if (id) {
        await addJobLog(id, 'error', `Échec global rewrite: ${msg}`);
        await updateStepStatus(id, 'rewrite', 'FAILED', msg);
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
