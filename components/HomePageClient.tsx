'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { UploadZone } from '@/components/UploadZone'
import { JobsPanel } from '@/components/JobsPanel'
import { t } from '@/lib/i18n'

// Export nommé + default pour éviter tout souci d'import
export function HomePageClient() {
  const [submitting, setSubmitting] = useState(false)
  const [enqueueError, setEnqueueError] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      {/* HERO */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Improve <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PDF</span>
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 max-w-3xl">
          Interface personnelle&nbsp;: chaque étape t’explique ce qu’elle fait.
          Ouvre un job pour voir les détails narratifs en direct.
        </p>
      </div>

      {/* GRILLE : Upload à gauche, infos à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-10">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {t('actions.upload') || 'Importer un PDF'}
            </h2>

            <UploadZone
              disabled={submitting}
              onUploaded={async (data: any) => {
                try {
                  setSubmitting(true)
                  setEnqueueError(null)
                  const res = await fetch('/api/enqueue', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                      fileKey: data?.key || data?.url || data?.path,
                      filename: data?.filename || data?.name || 'document.pdf',
                    }),
                  })
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    throw new Error(j?.error || `Enqueue failed (${res.status})`)
                  }
                } catch (e: any) {
                  setEnqueueError(e?.message ?? 'Erreur lors de la mise en file')
                } finally {
                  setSubmitting(false)
                }
              }}
            />

            {enqueueError && (
              <div className="mt-4 text-sm text-red-600">
                {enqueueError}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Besoin d’aide ?{' '}
              <Link href="/docs" className="text-blue-600 hover:underline">
                Consulte la doc
              </Link>.
            </p>
          </div>
        </div>

        {/* Carte “comment ça marche” / rassurance */}
        <aside className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Comment ça marche&nbsp;?</h3>
          <ol className="space-y-3 text-[13px] text-slate-600">
            <li>1. Dépose ton PDF ci-contre.</li>
            <li>2. Extraction → Nettoyage → Réécriture → Images → Rendu.</li>
            <li>3. Suis la progression en direct et récupère HTML/MD/PDF/EPUB.</li>
          </ol>
          <div className="mt-4 text-[11px] text-slate-400">
            Tes fichiers sont traités de façon éphémère pour générer les livrables.
          </div>
        </aside>
      </div>

      {/* Jobs récents */}
      <section>
        <h3 className="text-base font-semibold text-slate-800 mb-3">
          Traitements récents
        </h3>
        <JobsPanel />
      </section>
    </div>
  )
}

export default HomePageClient
