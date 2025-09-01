import OpenAI from 'openai';

type Preset = 'sobre' | 'pédagogique' | 'copywriter' | 'neutre' | 'journalistique';

export interface RewriteOptions {
  stylePreset?: Preset;
  maxInputChars?: number;
  maxOutputTokens?: number;
  retries?: number;
  temperature?: number;
  model?: string;
  baseURL?: string;
}

const DEFAULT_MODEL = process.env.OPENAI_REWRITE_MODEL || 'gpt-4o-mini';
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || undefined;

const sharedClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  ...(DEFAULT_BASE_URL ? { baseURL: DEFAULT_BASE_URL } : {}),
});

function isRetryableError(err: any): boolean {
  const status = err?.status ?? err?.code;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  const msg = String(err?.message || err || '');
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network error/i.test(msg);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeTruncate(input: string, maxChars: number): string {
  if (!maxChars || input.length <= maxChars) return input;
  const slice = input.slice(0, maxChars);
  const idx =
    slice.lastIndexOf('\n\n') > 0
      ? slice.lastIndexOf('\n\n')
      : slice.lastIndexOf('. ');
  if (idx > 200) return slice.slice(0, idx + 1);
  return slice;
}

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

  const client = baseURL
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL })
    : sharedClient;

  const input = safeTruncate(content, maxInputChars);
  const prompt = buildPrompt(input, stylePreset);

  const tryOnce = async () => {
    const res = await client.responses.create({
      model,
      temperature,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: 'system', content: 'Tu produis uniquement du texte Markdown propre.' },
        { role: 'user', content: prompt },
      ],
    });

    const text = (res as any).output_text as string | undefined;
    if (text && text.trim()) return text.trim();

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
      const delay = Math.min(250 * Math.pow(2, attempt), 2000);
      await sleep(delay);
    }
  }

  const msg = lastError?.message || String(lastError || 'Unknown OpenAI error');
  throw new Error(`OpenAI rewrite failed: ${msg}`);
}
