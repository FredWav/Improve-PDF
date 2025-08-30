export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
} from '@/lib/status'
import { splitMarkdownByHeadings, joinSections } from '@/lib/text'
import { rewriteSectionStrict } from '@/lib/ai'

async function fetchText(url: string) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`fetch fail ${r.status}`)
  return await r.text()
}

export async function POST(req: Request) {
  try {
    const { id, stylePreset } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await updateStepStatus(id, 'rewrite', 'RUNNING', 'Début réécriture')
    await addJobLog(id, 'info', 'Réécriture assistée IA (conservation du contenu)')

    // source: normalizedText obligatoire
    // On lit le manifest via outputs.normalizedText (déjà écrit en step normalize)
    // → ici on suppose que le frontend/app a utilisé addJobOutput('normalizedText', url)
    // Si tu stockes l’URL ailleurs, adapte.
    // On re-lis via status dans le client appelant si besoin — pour rester simple on passe l’URL directement plus tard.
    // Ici, pour cohérence avec ton flux actuel, on re-lit depuis Blob via le step normalize:
    // (Tu peux aussi faire arriver l’URL depuis req si tu préfères.)
    // @NOTE: si tu veux strict, tu peux recharger le manifest ici pour récupérer outputs.normalizedText.

    // Approach: demander à normalize de stocker la sortie dans outputs.normalizedText (déjà fait)
    // et ici, on va retrouver l'URL depuis le manifest en retéléchargeant status.
    // Pour ne pas multiplier les IO, on attend que normalize l’ait bien mis avant rewrite (ce qui est le cas).

    // On lit via saveProcessingData input:
    // -> ici on attend que normalize ait écrit `normalizedText` dans outputs :
    // Pour éviter un deuxième call au manifest dans ce handler (et coller à ta logique),
    // on accepte de redemander au client d’envoyer l’URL explicitement si tu préfères.
    // Version simple: on tente d’ouvrir `jobs/{id}/normalize/normalized.txt` en direct n’existe pas par défaut.
    // Donc on va juste… re-sauver/relire depuis outputs en aval : solution: passer par un petit GET status.

    // Petit helper inline pour charger l’URL depuis /api/status (évite le couplage fort):
    const statusUrl = new URL(`/api/status/${id}`, req.url).toString()
    const stRes = await fetch(statusUrl, { cache: 'no-store' })
    if (!stRes.ok) throw new Error('status load failed')
    const status = await stRes.json()
    const normalizedUrl: string | undefined = status?.outputs?.normalizedText
    if (!normalizedUrl) throw new Error('normalizedText not found in outputs')

    const normalizedMd = await fetchText(normalizedUrl)
    const sections = splitMarkdownByHeadings(normalizedMd)

    const rewritten: typeof sections = []
    let idx = 0
    for (const sec of sections) {
      idx++
      await addJobLog(id, 'info', `Réécriture section ${idx}/${sections.length} — ${sec.heading}`)
      const out = await rewriteSectionStrict(sec.content, {
        stylePreset,
        minRatio: 0.9,
        maxRatio: 1.15,
        maxRetries: 2
      })
      rewritten.push({ ...sec, content: out || sec.content })
    }

    const map = sections.map((s, i) => ({
      id: s.id,
      heading: s.heading,
      beforeWords: (s.content.match(/\S+/g) || []).length,
      afterWords: (rewritten[i].content.match(/\S+/g) || []).length
    }))

    const rewrittenMd = joinSections(rewritten)
    const mapUrl = await saveProcessingData(id, 'rewrite', JSON.stringify(map, null, 2), 'map.json')
    const mdUrl = await saveProcessingData(id, 'rewrite', rewrittenMd, 'rewritten.md')

    await addJobOutput(id, 'rewrittenText', mdUrl)
    await addJobLog(id, 'info', `Réécriture terminée — ${rewritten.length} sections traitées`)
    await updateStepStatus(id, 'rewrite', 'COMPLETED', 'Réécriture terminée')

    // Enchaîne images
    try {
      const nextURL = new URL('/api/jobs/images', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ ok: true, mdUrl, mapUrl }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'rewrite failed' }, { status: 500 })
  }
}
