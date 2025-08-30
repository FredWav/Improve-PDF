// Recherche Unsplash & Pexels (via fetch) + scoring simple.
export interface ImageCandidate {
  url: string
  width: number
  height: number
  source: 'unsplash' | 'pexels'
  author?: string
  profile?: string
  license?: string
  requiredAttribution?: boolean
  alt?: string
}

export async function searchUnsplash(query: string): Promise<ImageCandidate[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  const u = new URL('https://api.unsplash.com/search/photos')
  u.searchParams.set('query', query)
  u.searchParams.set('orientation', 'landscape')
  u.searchParams.set('per_page', '10')
  const res = await fetch(u, {
    headers: { Authorization: `Client-ID ${key}` },
    cache: 'no-store'
  })
  if (!res.ok) return []
  const data = await res.json()
  const arr = (data.results || []) as any[]
  return arr.map(x => ({
    url: x.urls?.regular || x.urls?.full || x.urls?.raw,
    width: x.width,
    height: x.height,
    source: 'unsplash' as const,
    author: x.user?.name,
    profile: x.user?.links?.html,
    license: 'Unsplash License',
    requiredAttribution: true,
    alt: x.alt_description || x.description || query
  }))
}

export async function searchPexels(query: string): Promise<ImageCandidate[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  const u = new URL('https://api.pexels.com/v1/search')
  u.searchParams.set('query', query)
  u.searchParams.set('per_page', '10')
  const res = await fetch(u, {
    headers: { Authorization: key },
    cache: 'no-store'
  })
  if (!res.ok) return []
  const data = await res.json()
  const arr = (data.photos || []) as any[]
  return arr.map(x => ({
    url: x.src?.large2x || x.src?.original || x.src?.large,
    width: x.width,
    height: x.height,
    source: 'pexels' as const,
    author: x.photographer,
    profile: x.photographer_url,
    license: 'Pexels License',
    requiredAttribution: true,
    alt: x.alt || query
  }))
}

export function pickBestLandscape(candidates: ImageCandidate[], want = 1): ImageCandidate[] {
  const scored = candidates
    .filter(c => c.width >= 1400 && c.width >= c.height) // paysage ≥ 1400px
    .map(c => {
      const ratio = c.width / Math.max(1, c.height)
      const closeness = Math.abs(ratio - 16/9)
      const score = (c.width * c.height) / 1e6 - closeness * 2
      return { c, score }
    })
    .sort((a,b) => b.score - a.score)
  const out: ImageCandidate[] = []
  const seen = new Set<string>()
  for (const s of scored) {
    if (s.c.url && !seen.has(s.c.url)) {
      out.push(s.c)
      seen.add(s.c.url)
    }
    if (out.length >= want) break
  }
  return out
}
