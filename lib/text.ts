// Découpage par sections Markdown + petites utilités.
export interface Section {
  id: string
  heading: string
  level: number
  content: string
}

export function splitMarkdownByHeadings(md: string): Section[] {
  const lines = md.split('\n')
  const sections: Section[] = []
  let current: Section | null = null
  let idx = 0

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) {
      if (current) sections.push({ ...current })
      current = {
        id: `sec-${++idx}`,
        heading: m[2].trim(),
        level: m[1].length,
        content: line + '\n'
      }
    } else {
      if (!current) {
        current = { id: `sec-${++idx}`, heading: 'Intro', level: 1, content: '' }
      }
      current.content += line + '\n'
    }
  }
  if (current) sections.push(current)
  return sections
}

export function joinSections(sections: Section[]): string {
  return sections.map(s => s.content.trimEnd()).join('\n\n') + '\n'
}
