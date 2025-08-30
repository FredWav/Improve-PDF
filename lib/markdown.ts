// Insertion d’images dans le Markdown + extraction de requêtes.
import { Section } from './text'

export interface ChosenImage {
  sectionId: string
  url: string
  width: number
  height: number
  source: 'unsplash' | 'pexels'
  author?: string
  profile?: string
  license?: string
  requiredAttribution?: boolean
  alt: string
  caption: string
  placement?: { afterHeading: boolean }
}

export function buildImageMarkdown(img: ChosenImage): string {
  const title = img.caption ? ` "${img.caption.replace(/"/g, "'")}"` : ''
  return `![${img.alt}](${img.url}${title})`
}

export function injectImages(sections: Section[], images: ChosenImage[]): string {
  const bySection = new Map<string, ChosenImage[]>()
  for (const im of images) {
    const arr = bySection.get(im.sectionId) || []
    arr.push(im)
    bySection.set(im.sectionId, arr)
  }

  const out: string[] = []
  for (const s of sections) {
    const imgs = bySection.get(s.id) || []
    if (!imgs.length) {
      out.push(s.content.trimEnd())
      continue
    }
    // insertion après le heading (première ligne) si présent
    const lines = s.content.split('\n')
    if (/^#{1,6}\s+/.test(lines[0])) {
      const header = lines.shift()!
      out.push(header)
      for (const im of imgs) {
        out.push('')
        out.push(buildImageMarkdown(im))
      }
      out.push('', ...lines)
    } else {
      // pas de heading formel
      for (const im of imgs) out.push(buildImageMarkdown(im))
      out.push('', s.content.trimEnd())
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

export function keywordsFromHeading(title: string): string[] {
  const words = (title.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(w => w.length > 2 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

const STOP = new Set([
  'les','des','aux','une','dans','avec','pour','par','sur','du','au',
  'and','the','for','from','into','over','about','avec','sans','entre'
])
