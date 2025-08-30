
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, addJobOutput } from '@/lib/status'
import { saveBlob } from '@/lib/blob'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await updateStepStatus(id, 'render', 'RUNNING')
    await addJobLog(id, 'info', 'Render started')
    // build a minimal PDF
    const text = `Improve PDF\nJob ${id}\nGénéré le ${new Date().toLocaleString('fr-FR')}`
    const encoder = new TextEncoder()
    const stamp = encoder.encode(text)
    function minimalPDF(bytes: Uint8Array): Uint8Array {
      // reuse precomputed bytes inside route (tiny util)
      const hdr = '%PDF-1.4\n'
      const lines = text.split('\n').map(l => `(${l}) Tj`).join(' ')
      const stream = `BT /F1 18 Tf 72 720 Td ${lines} ET`
      const b = new TextEncoder().encode(stream)
      const parts: Uint8Array[] = []
      function push(str: string|Uint8Array) { parts.push(typeof str==='string' ? new TextEncoder().encode(str) : str) }
      const offsets: number[] = []
      function off() { let n = 0; for (const p of parts) n += p.length; offsets.push(n) }
      push(hdr)
      off(); push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
      off(); push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
      off(); push('3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n')
      const len = b.length
      off(); push(`4 0 obj<< /Length ${len} >>stream\n`); push(b); push('\nendstream\nendobj\n')
      off(); push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')
      const xrefPos = parts.reduce((a,p)=>a+p.length,0)
      let xref = 'xref\n0 6\n0000000000 65535 f \n'
      for (const o of offsets) xref += (o.toString().padStart(10,'0') + ' 00000 n \n')
      push(xref)
      push(`trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)
      let total = new Uint8Array(parts.reduce((a,p)=>a+p.length,0))
      let offst = 0
      for (const p of parts) { total.set(p, offst); offst += p.length }
      return total
    }
    const pdfBytes = minimalPDF(stamp)
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const saved = await saveBlob(blob, { key: `jobs/${id}/outputs/ebook.pdf`, addTimestamp: false, allowOverwrite: true })
    await addJobOutput(id, 'pdf', saved.pathname)
    await updateStepStatus(id, 'render', 'COMPLETED')
    await addJobLog(id, 'info', 'Render completed')
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'render failed' }, { status: 500 })
  }
}
