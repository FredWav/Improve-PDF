import OpenAI from 'openai';

type Preset = 'sobre' | 'pédagogique' | 'copywriter' | 'neutre' | 'journalistique';

export interface RewriteOptions {
  stylePreset?: Preset;
  maxInputChars?: number;     // coupe poliment l’entrée si trop longue
  maxOutputTokens?: number;   // borne la sortie
  retries?: number;           // retries sur 429/5xx et erreurs réseau
  temperature?: number;
  model?: string;             // override, sinon var d’env ou défaut
  baseURL?: string;           // override, sinon var d’env ou défaut
}

const DEFAULT_MODEL = process.env.OPENAI_REWRITE_MODEL || 'gpt-4o-mini';
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || undefined;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  ...(DEFAULT_BASE_URL ? { baseURL: DEFAULT_BASE_URL } : {}),
});

/** Détermine si l’erreur est transitoire (retryable) */
function isRetryableError(err: any): boolean {
  // OpenAI.APIError expose souvent status
  const status = err?.status ?? err?.code;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  // fallback: erreurs réseau classiques
  const msg = String(err?.message || err || '');
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network error/i.test(msg);
}

/** Petite pause */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Tronque “proprement” sans couper en plein milieu d’un mot/markdown */
function safeTruncate(input: string, maxChars: number): string {
  if (!maxChars || input.length <= maxChars) return input;
  const slice = input.slice(0, maxChars);
  // essaie de couper en fin de phrase / paragraphe
  const idx =
    slice.lastIndexOf('\n\n') > 0
      ? slice.lastIndexOf('\n\n')
      : slice.lastIndexOf('. ');
  if (idx > 200) return slice.slice(0, idx + 1);
  return slice; // au pire, coupe sec
}

/** Prompt builder minimaliste mais strict (conserve sens/structure) */
function buildPrompt(content: string, style: Preset): string {
  const styleLine = (() => {
    switch (style) {
      case 'sobre':
        return 'Ton: sobre, clair, sans emphase.';
      case 'pédagogique':
        return 'Ton: pédagogique et accessible, phrases courtes.';
      case 'copywriter':
        return 'Ton: copywriting soft, plus engageant, sans exagération ni claims douteux.';
      case 'journalistique':
        return 'Ton: informatif, neutre, factuel.';
      default:
        return 'Ton: neutre et clair.';
    }
  })();

  return [
    'Tu es un assistant d’édition.',
    'RÉÉCRIS le texte suivant en FRANÇAIS en CONSERVANT exactement les idées, l’ordre logique et la structure (titres, listes si présentes).',
    'INTERDIT: inventer des faits, supprimer une information importante, ajouter des opinions.',
    'AUTORISÉ: reformuler pour la clarté, fluidifier les transitions, corriger grammaire/typos.',
    styleLine,
    '',
    '=== TEXTE À RÉÉCRIRE ===',
    content,
  ].join('\n');
}

/**
 * Réécrit une section avec garde-fous :
 * - tronquage d’entrée
 * - max_output_tokens borné
 * - retries exponentiels sur 429/5xx
 * - si tout échoue : throw (le caller gère le fallback)
 */
export async function rewriteSectionStrict(
  content: string,
  opts: RewriteOptions = {},
): Promise<string> {
  const {
    stylePreset = 'neutre',
    maxInputChars = 12000,
    maxOutputTokens = 900,
    retries = 3,
    temperature = 0.3,
    model = DEFAULT_MODEL,
    baseURL = DEFAULT_BASE_URL,
  } = opts;

  // possibilité d’override du baseURL au call
  const api = baseURL
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL })
    : client;

  const input = safeTruncate(content, maxInputChars);
  const prompt = buildPrompt(input, stylePreset);

  const tryOnce = async () => {
    const res = await api.responses.create({
      model,
      temperature,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: 'system', content: 'Tu produis uniquement du texte Markdown propre.' },
        { role: 'user', content: prompt },
      ],
    });

    // SDK v4+ fournit un helper
    const text = (res as any).output_text as string | undefined;
    if (text && text.trim().length > 0) return text.trim();

    // fallback si pas de helper (certaines versions)
    const candidate = (res as any)?.output?.[0]?.content?.[0]?.text ?? '';
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();

    throw new Error('Réponse IA vide');
  };

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await tryOnce();
    } catch (err: any) {
      lastError = err;
      if (!isRetryableError(err) || attempt === retries) break;
      // backoff progressif : 250ms, 500ms, 1000ms, 2000ms…
      const delay = Math.min(250 * Math.pow(2, attempt), 2000);
      await sleep(delay);
    }
  }

  // laisse le caller décider de fallback
  const msg = lastError?.message || String(lastError || 'Unknown OpenAI error');
  throw new Error(`OpenAI rewrite failed: ${msg}`);
}
