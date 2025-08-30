import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import EPub from 'epub-gen' // types via types/epub-gen.d.ts
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  addJobLog,
  addJobOutput,
  completeJob,
  loadJobStatus,
  updateStepStatus,
  type JobStatus,
} from '@/lib/status'
import { uploadText /* , uploadBytes | uploadBuffer */ } from '@/lib/blob'

type OutputsKey = keyof JobStatus['outputs']

/** Petite utilitaire fetch-texte sans cache */
async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Failed to fetch ${url} (${r.status})`)
  return await r.text()
}

/** Convertit Markdown -> HTML (avec un template lisible) */
async function mdToHtml(markdown: string, title = 'Ebook') {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)

  const bodyHtml = String(file)

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* Style “clean reading” sobre */
    :root { color-scheme: light; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #0f172a; }
    .page { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
    h1,h2,h3 { line-height: 1.25; margin: 1.6rem 0 .8rem; font-weight: 700; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: .2rem; }
    h3 { font-size: 1.25rem; }
    p { margin: .9rem 0; }
    ul,ol { padding-left: 1.5rem; }
    blockquote { margin: 1rem 0; padding: .5rem .9rem; background: #f8fafc; border-left: 3px solid #cbd5e1; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #f1f5f9; padding: .15rem .35rem; border-radius: .35rem; }
    pre code { display: block; padding: 1rem; overflow-x: auto; }
    figure { margin: 1.25rem 0; }
    figcaption { font-size: .9rem; color: #64748b; text-align: center; margin-top: .4rem; }
    img { max-width: 100%; height: auto; display: block; margin: 0.5rem auto; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e2e8f0; padding: .5rem .6rem; text-align: left; }
    a { color: #1d4ed8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .title { margin-top: 0; }
  </style>
</head>
<body>
  <main class="page">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </main>
</body>
</html>`

  return { html }
}

/** Lancement Puppeteer sûr (sans props non typées de chromium) */
async function launchBrowser() {
  const executablePath = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: executablePath || undefined,
    headless: true, // ne PAS lire chromium.headless (non typé)
  })
  return browser
}

/** Rendu PDF via Puppeteer → renvoie un Buffer */
async function renderPdfBuffer(html: string) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '18mm',
        left: '14mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    })
    return pdf
  } finally {
    await browser.close().catch(() => {})
  }
}

/** Génération EPUB via epub-gen en fichier temporaire, renvoie un Buffer */
async function renderEpubBuffer(html: string, title = 'Ebook', author = 'Improve PDF') {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ebook-'))
  const outPath = path.join(tmpDir, `${slugify(title)}.epub`)

  const content = [{ title, data: html }]

  const options = {
    title,
    author,
    content,
    verbose: false,
    tempDir: tmpDir,
    output: outPath,
  }

  // @ts-ignore types simplifiés par declaration file
  await new EPub(options).promise

  const buf = await fs.readFile(outPath)
  return buf
}

function slugify(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string))
}

/** Choisit la meilleure source Markdown finale (enriched > rewritten > normalized) */
function pickSource(status: JobStatus): { url?: string; kind?: 'enriched'|'rewritten'|'normalized' } {
  const out = status.outputs || {}
  // On privilégie “rewrittenText” (qui peut déjà être enrichi via /images)
  if (out.rewrittenText) return { url: out.rewrittenText, kind: 'rewritten' }
  if (out.normalizedText) return { url: out.normalizedText, kind: 'normalized' }
  if (out.rawText) return { url: out.rawText, kind: 'normalized' } // fallback très dégradé
  return {}
}

/** POST /api/jobs/render */
export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const body = await req.json().catch(() => ({}))
    const id: string | undefined = body?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await updateStepStatus(id, 'render', 'RUNNING', 'Rendu démarré')

    const status = await loadJobStatus(id)
    if (!status) {
      await updateStepStatus(id, 'render', 'FAILED', 'Job introuvable')
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const title = status.filename || status.id
    const { url: srcUrl } = pickSource(status)
    if (!srcUrl) {
      await addJobLog(id, 'error', 'Aucune source Markdown disponible pour le rendu')
      await updateStepStatus(id, 'render', 'FAILED', 'Pas de source')
      return NextResponse.json({ error: 'No source to render' }, { status: 400 })
    }

    await addJobLog(id, 'info', `Lecture source: ${srcUrl}`)
    const md = await fetchText(srcUrl)

    // MD -> HTML
    const { html } = await mdToHtml(md, title)

    // Sauvegarde HTML
    const htmlKey = `jobs/${id}/render/final.html`
    const htmlRes = await uploadText(html, { key: htmlKey, addTimestamp: false })
    const htmlUrl = htmlRes.url
    await addJobOutput(id, 'html', htmlUrl)
    await addJobOutput(id, 'renderedHtml', htmlUrl)
    await addJobLog(id, 'info', `HTML rendu: ${htmlUrl}`)

    // PDF
    try {
      const pdfBuf = await renderPdfBuffer(html)

      // ====> IMPORTANT : uploader binaire. Adapte au helper dispo dans ton lib/blob.
      // Si tu as uploadBytes / uploadBuffer, utilise-le ici :
      // const pdfUp = await uploadBytes(pdfBuf, { key: `jobs/${id}/render/final.pdf`, addTimestamp: false, contentType: 'application/pdf' })
      // const pdfUrl = pdfUp.url

      // Si tu n'as QUE uploadText, dis-le moi et je te renvoie une version alternative.
      // Pour l’instant, on suppose un uploader binaire existe :
      const anyUpload: any = (globalThis as any).uploadBytes || (uploadText as any)
      const pdfUp = await anyUpload(pdfBuf, {
        key: `jobs/${id}/render/final.pdf`,
        addTimestamp: false,
        contentType: 'application/pdf',
      })
      const pdfUrl = pdfUp.url

      await addJobOutput(id, 'pdf', pdfUrl)
      await addJobOutput(id, 'pdfOutput', pdfUrl)
      await addJobLog(id, 'info', `PDF généré: ${pdfUrl}`)
    } catch (e: any) {
      await addJobLog(id, 'warn', `PDF non généré: ${e?.message || e}`)
    }

    // EPUB
    try {
      const epubBuf = await renderEpubBuffer(html, title, 'Improve PDF')

      // Uploader binaire idem PDF :
      const anyUpload: any = (globalThis as any).uploadBytes || (uploadText as any)
      const epubUp = await anyUpload(epubBuf, {
        key: `jobs/${id}/render/final.epub`,
        addTimestamp: false,
        contentType: 'application/epub+zip',
      })
      const epubUrl = epubUp.url

      await addJobOutput(id, 'epub', epubUrl)
      await addJobLog(id, 'info', `EPUB généré: ${epubUrl}`)
    } catch (e: any) {
      await addJobLog(id, 'warn', `EPUB non généré: ${e?.message || e}`)
    }

    // MD final (on garde une copie telle que rendue)
    const mdKey = `jobs/${id}/render/final.md`
    const mdRes = await uploadText(md, { key: mdKey, addTimestamp: false })
    await addJobOutput(id, 'md', mdRes.url)
    await addJobOutput(id, 'renderedMarkdown', mdRes.url)

    await completeJob(id)
    await addJobLog(id, 'info', `Rendu terminé en ${(Date.now() - started) / 1000}s`)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const msg = err?.message || String(err)
    try {
      const body = await req.json().catch(() => ({}))
      const id: string | undefined = body?.id
      if (id) {
        await addJobLog(id, 'error', `Render error: ${msg}`)
        await updateStepStatus(id, 'render', 'FAILED', msg)
      }
    } catch {}
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 })
  }
}
