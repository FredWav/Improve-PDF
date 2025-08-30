// app/api/jobs/images/route.ts
import { NextResponse } from 'next/server'
import {
  addJobLog,
  addJobOutput,
  loadJobStatus,
  updateStepStatus,
} from '@/lib/status'
import { getFile, uploadJSON, uploadText } from '@/lib/blob'

type Provider = 'unsplash' | 'pexels'

type UnsplashPhoto = {
  id: string
  width: number
  height: number
  urls: { raw: string; full: string; regular: string; small: string; thumb: string }
  description: string | null
  alt_description: string | null
  user: {
    name: string
    links?: { html?: string }
    username?: string
  }
}

type PexelsPhoto = {
  id: number
  width: number
  height: number
  photographer: string
  photographer_url?: string
  url?: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt?: string
}

type ImageManifest = {
  version: 1
  images: Array<{
    id: string // section id (slug du heading)
    query: string
    source: Provider
    url: string
    width: number
    height: number
    credit: {
      author: string
      profile?: string
      license: string
      requiredAttribution: boolean
    }
    placement: { afterHeadingId: string; indexInDoc: number }
    alt: string
    caption: string
    aspect: string
  }>
}

const MAX_IMAGES = 12

// --- Utils -------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, base = 250): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      await sleep(base * (i + 1))
    }
  }
  throw lastErr
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function wordScoreRatioTo(target = 16 / 9, w?: number, h?: number) {
  if (!w || !h) return 0
  const ratio = w / h
  const diff = Math.abs(ratio - target)
  return 1 - Math.min(diff, 1) // 1 (parfait) → 0
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[0] : undefined
}

// --- Headings & queries ------------------------------------------------------

type Section = { level: 1 | 2; title: string; slug: string; lineIndex: number }

function extractSections(md: string): Section[] {
  const lines = md.split('\n')
  const sections: Section[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^#\s+/.test(line)) {
      const title = line.replace(/^#\s+/, '').trim()
      sections.push({ level: 1, title, slug: slugify(title), lineIndex: i })
    } else if (/^##\s+/.test(line)) {
      const title = line.replace(/^##\s+/, '').trim()
      sections.push({ level: 2, title, slug: slugify(title), lineIndex: i })
    }
  }
  return sections
}

const STOPWORDS_FR_EN = new Set([
  'le','la','les','de','des','du','un','une','et','ou','en','dans','pour','par','avec','sans','sur','sous',
  'a','the','of','in','on','for','to','and','or','by','with','from','at','as','is','are','be','an'
])

function keywordsFromTitle(title: string, max = 6): string[] {
  const tokens = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOPWORDS_FR_EN.has(w))
  return tokens.slice(0, max)
}

function queryFromSection(s: Section): string {
  const kws = keywordsFromTitle(s.title, 6)
  return kws.join(' ') || s.title
}

// --- Providers ---------------------------------------------------------------

async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('per_page', '10')

  const res = await withRetry(() =>
    fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` }
    })
  )
  if (!res.ok) return []
  const data: { results: UnsplashPhoto[] } = await res.json()
  return data.results || []
}

async function searchPexels(query: string): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '10')
  url.searchParams.set('orientation', 'landscape')

  const res = await withRetry(() =>
    fetch(url.toString(), {
      headers: { Authorization: key }
    })
  )
  if (!res.ok) return []
  const data: { photos: PexelsPhoto[] } = await res.json()
  return data.photos || []
}

type PickedImage = {
  provider: Provider
  url: string
  width: number
  height: number
  author: string
  authorProfile?: string
  captionHint?: string
  altHint?: string
}

function scoreCandidate(w: number, h: number): number {
  const pxScore = Math.min((w * h) / (1600 * 900), 1) // 1 si >= ~FHD
  const ratioScore = wordScoreRatioTo(16 / 9, w, h)
  return 0.6 * pxScore + 0.4 * ratioScore
}

function dedupeBy<T>(arr: T[], fn: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of arr) {
    const k = fn(it)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

function pickBestFromUnsplash(list: UnsplashPhoto[]): PickedImage | undefined {
  const sorted = [...list].sort((a, b) => scoreCandidate(b.width, b.height) - scoreCandidate(a.width, a.height))
  const top = pick(sorted)
  if (!top) return
  return {
    provider: 'unsplash',
    url: top.urls.regular || top.urls.full || top.urls.raw,
    width: top.width,
    height: top.height,
    author: top.user?.name || 'Unknown',
    authorProfile: top.user?.links?.html || (top.user?.username ? `https://unsplash.com/@${top.user.username}` : undefined),
    captionHint: top.description || top.alt_description || undefined,
    altHint: top.alt_description || top.description || undefined,
  }
}

function pickBestFromPexels(list: PexelsPhoto[]): PickedImage | undefined {
  const sorted = [...list].sort((a, b) => scoreCandidate(b.width, b.height) - scoreCandidate(a.width, a.height))
  const top = pick(sorted)
  if (!top) return
  return {
    provider: 'pexels',
    url: top.src.landscape || top.src.large || top.src.large2x || top.src.original,
    width: top.width,
    height: top.height,
    author: top.photographer || 'Unknown',
    authorProfile: top.photographer_url || top.url,
    captionHint: top.alt || undefined,
    altHint: top.alt || undefined,
  }
}

// --- Markdown injection ------------------------------------------------------

function imageMarkdown(url: string, alt: string, caption?: string): string {
  // Markdown image: alt + caption via title
  if (caption) return `![${alt}](${url} "${caption.replace(/"/g, "'")}")`
  return `![${alt}](${url})`
}

function injectAfterHeadings(md: string, sections: Section[], perSectionImage: Map<string, { mdLine: string }>) {
  const lines = md.split('\n')
  // On injecte à partir de la fin pour ne pas casser les index
  const sorted = [...sections].sort((a, b) => b.lineIndex - a.lineIndex)
  for (const s of sorted) {
    const img = perSectionImage.get(s.slug)
    if (!img) continue
    const insertAt = s.lineIndex + 1
    lines.splice(insertAt, 0, '', img.mdLine, '') // une ligne vide avant/après pour l’aération
  }
  return lines.join('\n')
}

// --- Route handler -----------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = body?.id as string
    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    await updateStepStatus(id, 'images', 'RUNNING', 'Démarrage de la sélection d’images')

    const status = await loadJobStatus(id)
    if (!status) {
      await updateStepStatus(id, 'images', 'FAILED', 'Manifest introuvable')
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Texte d’entrée : priorité au rewritten, fallback normalized
    const srcUrl =
      status.outputs.rewrittenText ??
      status.outputs.normalizedText

    if (!srcUrl) {
      await addJobLog(id, 'warn', 'Aucun texte disponible pour l’insertion d’images (rewritten/normalized manquants)')
      await updateStepStatus(id, 'images', 'FAILED', 'Aucun texte source')
      return NextResponse.json({ error: 'No text to enrich' }, { status: 400 })
    }

    const res = await getFile(srcUrl)
    if (!res.ok) {
      await updateStepStatus(id, 'images', 'FAILED', 'Lecture du texte source échouée')
      return NextResponse.json({ error: 'Failed to read input text' }, { status: 500 })
    }
    const md = await res.text()

    const sections = extractSections(md)
    if (sections.length === 0) {
      await addJobLog(id, 'warn', 'Aucun heading H1/H2 détecté — aucune image insérée')
      // On sauvegarde quand même une version "enriched" identique
      const enrichedUrl = (await uploadText(md, {
        key: `jobs/${id}/images/enriched.md`,
        addTimestamp: false
      })).url
      await addJobOutput(id, 'rewrittenText', enrichedUrl)
      await updateStepStatus(id, 'images', 'COMPLETED', 'Aucune section à illustrer')
      return NextResponse.json({ ok: true })
    }

    const perSectionImage = new Map<string, { mdLine: string; meta: ImageManifest['images'][number] }>()
    const manifest: ImageManifest = { version: 1, images: [] }

    let count = 0
    const usedSig = new Set<string>() // éviter doublons (provider+url)

    for (const s of sections) {
      if (count >= MAX_IMAGES) break

      const query = queryFromSection(s)
      if (!query) continue

      await addJobLog(id, 'info', `Recherche d’images pour: "${query}"`)
      // Unsplash d’abord
      let picked: PickedImage | undefined
      try {
        const u = await searchUnsplash(query)
        if (u.length) picked = pickBestFromUnsplash(u)
      } catch (e) {
        await addJobLog(id, 'warn', `Unsplash erreur (${String(e)})`)
      }

      // Fallback Pexels
      if (!picked) {
        try {
          const p = await searchPexels(query)
          if (p.length) picked = pickBestFromPexels(p)
        } catch (e) {
          await addJobLog(id, 'warn', `Pexels erreur (${String(e)})`)
        }
      }

      if (!picked) {
        await addJobLog(id, 'info', `Aucune image adéquate pour "${query}"`)
        continue
      }

      const sig = `${picked.provider}:${picked.url}`
      if (usedSig.has(sig)) continue
      usedSig.add(sig)

      const alt = picked.altHint || s.title
      const caption =
        `${picked.captionHint ? picked.captionHint + ' — ' : ''}Photo: ${picked.author} (${picked.provider === 'unsplash' ? 'Unsplash' : 'Pexels'})`

      const mdLine = imageMarkdown(picked.url, alt, caption)

      const meta: ImageManifest['images'][number] = {
        id: s.slug,
        query,
        source: picked.provider,
        url: picked.url,
        width: picked.width,
        height: picked.height,
        credit: {
          author: picked.author,
          profile: picked.authorProfile,
          license: picked.provider === 'unsplash' ? 'Unsplash License' : 'Pexels License',
          requiredAttribution: true
        },
        placement: { afterHeadingId: s.slug, indexInDoc: s.lineIndex + 1 },
        alt,
        caption,
        aspect: '16:9'
      }

      perSectionImage.set(s.slug, { mdLine, meta })
      manifest.images.push(meta)
      count++
    }

    const enriched = injectAfterHeadings(md, sections, perSectionImage)

    const manifestUrl = (await uploadJSON(manifest, {
      key: `jobs/${id}/images/manifest.json`,
      addTimestamp: false
    })).url

    const enrichedUrl = (await uploadText(enriched, {
      key: `jobs/${id}/images/enriched.md`,
      addTimestamp: false
    })).url

    // On expose le manifest et on choisit d’utiliser la version enrichie comme rewrittenText final
    await addJobOutput(id, 'imagesManifest', manifestUrl)
    await addJobOutput(id, 'rewrittenText', enrichedUrl)

    await addJobLog(id, 'info', `Images sélectionnées: ${count}`)
    await updateStepStatus(id, 'images', 'COMPLETED', 'Images insérées')

    return NextResponse.json({ ok: true, images: count })
  } catch (err) {
    // best effort logging
    try {
      const body = await req.json().catch(() => ({}))
      const id = body?.id as string | undefined
      if (id) {
        await updateStepStatus(id, 'images', 'FAILED', 'Erreur pendant l’insertion des images')
        await addJobLog(id, 'error', `Images: ${String(err)}`)
      }
    } catch {}
    return NextResponse.json({ error: 'Internal Server Error', detail: String(err) }, { status: 500 })
  }
}
