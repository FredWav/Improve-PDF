// Client OpenAI (v5.x) + helper "rewriteSection" avec contrôle de longueur.
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function rewriteSectionStrict(markdown: string, opts?: {
  stylePreset?: string
  minRatio?: number // ex 0.9
  maxRatio?: number // ex 1.15
  maxRetries?: number // ex 2
}) {
  const {
    stylePreset,
    minRatio = 0.9,
    maxRatio = 1.15,
    maxRetries = 2
  } = opts || {}

  let attempts = 0
  const inCount = wordCount(markdown)

  while (true) {
    attempts++
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Tu es un éditeur professionnel. Tu améliores le texte pour le rendre publiable en ebook, sans supprimer d’information. Tu respectes strictement la structure Markdown.'
        },
        {
          role: 'user',
          content:
            `Contrainte de longueur: la sortie doit contenir entre ${Math.round(
              minRatio * 100
            )}% et ${Math.round(
              maxRatio * 100
            )}% du nombre de mots de l'entrée.
Interdictions: ne supprime pas d'idées, d'exemples, de chiffres ni de citations ; ne change pas les noms propres.
Maintiens le ton original${stylePreset ? ` (preset: ${stylePreset})` : ''}. Corrige la typographie française.

Texte à réécrire (Markdown):
---
${markdown}
---

Réponds uniquement avec le Markdown réécrit, sans commentaire autour.`
        }
      ]
    })

    const out = completion.choices[0]?.message?.content ?? ''
    const outCount = wordCount(out || '')
    const ratio = outCount / Math.max(1, inCount)

    if (ratio >= minRatio && ratio <= maxRatio) {
      return out
    }
    if (attempts > maxRetries) {
      // on accepte en dernier recours, mais on loguera côté route
      return out
    }
    // sinon on retente
  }
}

export function wordCount(s: string): number {
  return (s.trim().match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length
}
