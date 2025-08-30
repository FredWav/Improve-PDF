/* app/api/jobs/render/route.ts */
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import EPub from 'epub-gen'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'

import {
  addJobLog,
  addJobOutput,
  loadJobStatus,
  updateStepStatus,
  completeJob,
} from '@/lib/status'
import { getFile, uploadText } from '@/lib/blob'
import { put } from '@vercel/blob'

type HtmlPack = { html: string; title: string }

/** CSS de lecture sobre (inline dans l’HTML) */
const READER_CSS = `
:root{--bg:#ffffff;--fg:#0f172a;--muted:#475569;--border:#e2e8f0;}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
main{max-width:820px;margin:48px auto;padding:0 24px}
h1{font-size:2rem;margin:0 0 0.75em}
h2{font-size:1.5rem;margin:2.0em 0 0.6em;border-bottom:1px solid var(--border);padding-bottom:.3em}
h3{font-size:1.25rem;margin:1.6em 0 0.5em}
p{margin:0 0 1em}
ul,ol{margin:0 0 1.2em 1.4em}
li{margin:0.3em 0}
blockquote{margin:1.2em 0;padding-left:1em;border-left:3px solid var(--border);color:var(--muted)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#f8fafc;border:1px solid var(--border);padding:.1em .35em;border-radius:.35rem}
pre code{display:block;padding:1em;overflow:auto}
img{display:block;max-width:100%;margin:1.2em auto;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
figure{margin:1.2em 0;text-align:center}
figcaption{font-size:.9rem;color:var(--muted);margin-top:.35em}
hr{border:0;border-top:1px solid var(--border);margin:2em 0}
.footer-credits{margin:3em 0 1em;padding-top:1em;border-top:1px dashed var(--border);color:var(--muted);font-size:.9rem}
`

/** Convertit du Markdown en HTML stylé */
async function mdToHtml(markdown: string, title = 'Ebook'): Promise<HtmlPack> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)

  const body = String(file)
  const html =
`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>${READER_CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`

  return { html, title }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' : '&#39;'
  ))
}

/** Télécharge une URL Blob en texte brut */
async function fetchText(url: string) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Fetch failed ${r.status}`)
  return r.text()
}

/** Upload binaire (PDF/EPUB) direct vers Vercel Blob */
async function uploadBinary(
  bytes: Uint8Array | ArrayBuffer,
  key: string,
  contentType: string
) {
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  // access: 'public' pour obtenir une URL publique comme le reste de tes sorties
  const { url } = await put(key, body, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })
  return url
}

async function renderPDF(html: string, id: string) {
  // Chromium Lambda: chemin + flags headless corrects
  const executablePath = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: chromium.headless ?? true,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  await page.setContent(html, { waitUntil: 'load' })
  const pdf = await page.pdf({
    printBackground: true,
    format: 'A5',
    margin: { top: '24mm', right: '18mm', bottom: '24mm', left: '18mm' },
  })
  await browser.close()

  const url = await uploadBinary(
    pdf,
    `jobs/${id}/render/output.pdf`,
    'application/pdf'
  )
  return url
}

async function renderEPUB(html: string, title: string, id: string) {
  // epub-gen écrit sur disque → tmpfile puis upload binaire
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'epub-'))
  const outPath = path.join(tmp, 'book.epub')

  const epub = new EPub({
    title: title || 'Ebook',
    author: 'Unknown',
    publisher: 'Improve PDF',
    content: [
      { title: title || 'Ebook', data: html }
    ],
    output: outPath,
  } as any)

  await epub

  const bytes = await fs.readFile(outPath)
  const url = await uploadBinary(
    bytes,
    `jobs/${id}/render/output.epub`,
    'application/epub+zip'
  )

  // best-effort cleanup
  try { await fs.rm(tmp, { recursive: true, force: true }) } catch {}

  return url
}

export async function POST(req: Request) {
  let id: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    id = body?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    await updateStepStatus(id, 'render', 'RUNNING', 'Démarrage du rendu (md/html/pdf/epub)')

    const status = await loadJobStatus(id)
    if (!status) {
      await updateStepStatus(id, 'render', 'FAILED', 'Manifest introuvable')
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Source prioritaire : enriched → rewritten → normalized
    const srcUrl =
      status.outputs.rewrittenText ??
      status.outputs.normalizedText ??
      null

    if (!srcUrl) {
      await addJobLog(id, 'warn', 'Aucun texte disponible pour le rendu')
      await updateStepStatus(id, 'render', 'FAILED', 'Aucun texte source')
      return NextResponse.json({ error: 'No text to render' }, { status: 400 })
    }

    const md = await fetchText(srcUrl)
    const title =
      status.filename?.replace(/\.[^.]+$/, '') ||
      'Ebook'

    // 1) MD final (on republie une copie "render/final.md")
    const mdUrl = (await uploadText(md, {
      key: `jobs/${id}/render/final.md`,
      addTimestamp: false,
    })).url
    await addJobOutput(id, 'md', mdUrl)
    // Compat (API download type rendered-markdown)
    await addJobOutput(id, 'renderedMarkdown', mdUrl)

    await addJobLog(id, 'info', 'Conversion Markdown → HTML')
    const { html } = await mdToHtml(md, title)

    // 2) HTML
    const htmlUrl = (await uploadText(html, {
      key: `jobs/${id}/render/final.html`,
      addTimestamp: false,
    })).url
    await addJobOutput(id, 'html', htmlUrl)
    // Compat
    await addJobOutput(id, 'renderedHtml', htmlUrl)

    // 3) PDF
    await addJobLog(id, 'info', 'Génération du PDF avec Chromium')
    const pdfUrl = await renderPDF(html, id)
    await addJobOutput(id, 'pdf', pdfUrl)
    // Compat éventuelle
    await addJobOutput(id, 'pdfOutput', pdfUrl)

    // 4) EPUB
    await addJobLog(id, 'info', 'Packaging EPUB')
    const epubUrl = await renderEPUB(html, title, id)
    await addJobOutput(id, 'epub', epubUrl)

    await addJobLog(id, 'info', 'Rendu terminé')
    await updateStepStatus(id, 'render', 'COMPLETED', 'md/html/pdf/epub prêts')
    await completeJob(id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (id) {
      await updateStepStatus(id, 'render', 'FAILED', 'Erreur pendant le rendu')
      await addJobLog(id, 'error', `Render: ${String(err)}`)
    }
    return NextResponse.json({ error: 'Internal Server Error', detail: String(err) }, { status: 500 })
  }
}
