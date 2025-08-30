export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import {
  updateStepStatus,
  addJobLog,
  saveProcessingData,
  addJobOutput,
  completeJob,
} from '@/lib/status'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import EPub from 'epub-gen' // "epub-gen": "0.1.0"

async function fetchText(url: string) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`fetch fail ${r.status}`)
  return await r.text()
}

function htmlTemplate(bodyHtml: string, title = 'Ebook') {
  // CSS lecture simple
  const css = `
  :root { color-scheme: light dark; }
  body { font-family: ui-serif, Georgia, 'Times New Roman', serif; line-height: 1.6; margin: 2rem auto; max-width: 750px; padding: 0 1rem; }
  h1,h2,h3 { line-height: 1.2; margin-top: 2.2rem; }
  img { max-width: 100%; height: auto; display:block; margin: 1rem auto; }
  figure { margin: 1rem 0; }
  figcaption { font-size: .9rem; color: #666; text-align: center; }
  code, pre { font-family: ui-monospace, Menlo, Consolas, monospace; }
  `
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${css}</style></head><body>${bodyHtml}</body></html>`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' } as any)[m]
  )
}

async function mdToHtml(md: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md)
  const htmlBody = String(file)
  return htmlTemplate(htmlBody)
}

async function htmlToPdf(html: string, title = 'Ebook'): Promise<Buffer> {
  const exe = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: exe,
    headless: true
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: false
  })
  await browser.close()
  return pdf
}

async function htmlToEpub(html: string, title = 'Ebook'): Promise<Buffer> {
  // epub-gen écrit sur disque → on génère un fichier temporaire puis on lit le buffer
  const tmpDir = await (async () => await import('node:fs/promises'))()
  const outPath = path.join(os.tmpdir(), `ebook-${Date.now()}.epub`)
  await new Promise<void>((resolve, reject) => {
    const option = {
      title,
      content: [{ title, data: html }]
    } as any
    new EPub(option, outPath).promise
      .then(() => resolve())
      .catch(reject)
  })
  const buf = await (await import('node:fs/promises')).readFile(outPath)
  return buf
}

export async function POST(req: Request) {
  try {
    const { id, title } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await updateStepStatus(id, 'render', 'RUNNING', 'Début rendu final')
    await addJobLog(id, 'info', 'Conversion MD→HTML→PDF/EPUB')

    // Choisir la meilleure source dispo (enriched > rewritten > normalized)
    const statusUrl = new URL(`/api/status/${id}`, req.url).toString()
    const stRes = await fetch(statusUrl, { cache: 'no-store' })
    if (!stRes.ok) throw new Error('status load failed')
    const status = await stRes.json()

    const srcUrl: string | undefined =
      status?.outputs?.rewrittenText || status?.outputs?.normalizedText
    if (!srcUrl) throw new Error('no markdown source')

    const md = await fetchText(srcUrl)
    const html = await mdToHtml(md)
    const fullHtml = htmlTemplate(html, title || status.filename || 'Ebook')

    // HTML final
    const htmlUrl = await saveProcessingData(id, 'render', fullHtml, 'final.html')
    await addJobOutput(id, 'html', htmlUrl)

    // PDF
    const pdfBuf = await htmlToPdf(fullHtml, title || 'Ebook')
    const pdfPath = path.join(os.tmpdir(), `ebook-${id}.pdf`)
    await writeFile(pdfPath, pdfBuf)
    const pdfUrl = await saveProcessingData(id, 'render', pdfBuf.toString('base64'), 'final.pdf.b64')
    // NB: Blob n’accepte pas Buffer direct via uploadText. Côté prod, utilise un upload binaire si tu as un helper ; sinon garde le .b64.
    await addJobOutput(id, 'pdf', pdfUrl)

    // EPUB
    const epubBuf = await htmlToEpub(fullHtml, title || 'Ebook')
    const epubUrl = await saveProcessingData(id, 'render', epubBuf.toString('base64'), 'final.epub.b64')
    await addJobOutput(id, 'epub', epubUrl)

    await updateStepStatus(id, 'render', 'COMPLETED', 'Rendu terminé')
    await addJobLog(id, 'info', 'Rendus produits: HTML, PDF, EPUB')
    await completeJob(id)

    return NextResponse.json({ ok: true, htmlUrl, pdfUrl, epubUrl }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'render failed' }, { status: 500 })
  }
}
