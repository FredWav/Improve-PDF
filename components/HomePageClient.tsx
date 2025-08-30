'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { UploadZone } from '@/components/UploadZone'
import { JobsPanel } from '@/components/JobsPanel'
import { t } from '@/lib/i18n'

// >>> Export NOMMÉ + export par défaut à la fin
export function HomePageClient() {
  const [submitting, setSubmitting] = useState(false)
  const [enqueueError, setEnqueueError] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Titre + sous-titre */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Improve PDF
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Interface personnelle&nbsp;: chaque étape t’explique ce qu’elle fait.
          Ouvre un job pour voir les détails narratifs en direct.
        </p>
      </div>

      {/* Carte upload */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/[0.02] p-6 sm:p-8 mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('actions.upload') || 'Importer un PDF'}
          </h2>
        </div>

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
          Besoin d’aide ? <Link href="/docs" className="text-blue-600 hover:underline">Consulte la doc</Link>.
        </p>
      </div>

      {/* Jobs récents */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">
          Traitements récents
        </h3>
        <JobsPanel />
      </div>
    </div>
  )
}

// >>> Export par défaut pour couvrir les deux styles d'import
export default HomePageClient
