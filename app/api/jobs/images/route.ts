export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
} from '@/lib/status'
import { splitMarkdownByHeadings } from '@/lib/text'
import { keywordsFromHeading, injectImages } from '@/lib/markdown'
import { searchUnsplash, searchPexels, pickBestLandscape } from '@/lib/images'

async function fetchText(url: string) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`fetch fail ${r.status}`)
  return await r.text()
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await updateStepStatus(id, 'images', 'RUNNING', 'Sélection des images')
    await addJobLog(id, 'info', 'Recherche d’images (Unsplash/Pexels)')

    // Charger status pour savoir quelle source textuelle prendre
    const statusUrl = new URL(`/api/status/${id}`, req.url).toString()
    const stRes = await fetch(statusUrl, { cache: 'no-store' })
    if (!stRes.ok) throw new Error('status load failed')
    const status = await stRes.json()

    const rewrittenUrl: string | undefined =
      status?.outputs?.rewrittenText || status?.outputs?.normalizedText
    if (!rewrittenUrl) throw new Error('missing text for images step')

    const md = await fetchText(rewrittenUrl)
    const sections = splitMarkdownByHeadings(md)

    const chosen: any[] = []
    let imagesCount = 0

    for (const sec of sections) {
      // 1 image par section notable (H1/H2)
      if (sec.level > 2) continue
      const kws = keywordsFromHeading(sec.heading)
      if (!kws.length) continue

      const query = kws.join(' ')
      const u = await searchUnsplash(query)
      let best = pickBestLandscape(u, 1)
      if (!best.length) {
        const p = await searchPexels(query)
        best = pickBestLandscape(p, 1)
      }
      if (!best.length) {
        await addJobLog(id, 'warn', `Aucune image trouvée pour: ${query}`)
        continue
      }
      const b = best[0]
      chosen.push({
        sectionId: sec.id,
        query,
        source: b.source,
        url: b.url,
        width: b.width,
        height: b.height,
        credit: {
          author: b.author,
          profile: b.profile,
          license: b.license,
          requiredAttribution: b.requiredAttribution ?? true
        },
        placement: { afterHeadingId: sec.id },
        alt: b.alt || sec.heading,
        caption: `${b.alt || sec.heading} — Photo: ${b.author || b.source} (${b.source})`
      })
      imagesCount++
      if (imagesCount >= 12) break
    }

    const manifest = { version: 1, images: chosen }
    const manifestUrl = await saveProcessingData(
      id, 'images', JSON.stringify(manifest, null, 2), 'imagesManifest.json'
    )

    // injection dans le markdown
    const enriched = injectImages(
      sections,
      chosen.map((c: any) => ({
        sectionId: c.sectionId,
        url: c.url,
        width: c.width,
        height: c.height,
        source: c.source,
        author: c.credit?.author,
        profile: c.credit?.profile,
        license: c.credit?.license,
        requiredAttribution: c.credit?.requiredAttribution,
        alt: c.alt,
        caption: c.caption
      }))
    )

    const enrichedUrl = await saveProcessingData(id, 'images', enriched, 'enriched.md')

    // on choisit d’utiliser la version enrichie comme rewrittenText “final”
    await addJobOutput(id, 'imagesManifest', manifestUrl as any) // champs supplémentaire non-breaking si tu l’ajoutes
    await addJobOutput(id, 'rewrittenText', enrichedUrl)

    await addJobLog(id, 'info', `Images sélectionnées: ${imagesCount}`)
    await updateStepStatus(id, 'images', 'COMPLETED', 'Images terminées')

    // Enchaîne render
    try {
      const nextURL = new URL('/api/jobs/render', req.url)
      await fetch(nextURL.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        cache: 'no-store',
      })
    } catch {}

    return NextResponse.json({ ok: true, manifestUrl, enrichedUrl }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'images failed' }, { status: 500 })
  }
}
