'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/UploadZone'
import { JobsPanel } from '@/components/JobsPanel'

/**
 * Page d'accueil côté client.
 * On garde les mêmes exports et on câble correctement l'upload -> enqueue -> redirection.
 */
export function HomePageClient() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [enqueueError, setEnqueueError] = useState<string | null>(null)

  async function handleUploaded(info: any) {
    // info vient de /api/upload et contient au minimum { url, pathname, size, uploadedAt }
    const fileKey = info?.pathname || info?.fileId || info?.url
    const filename =
      info?.filename || info?.name || (typeof info?.pathname === 'string' ? info.pathname.split('/').pop() : 'document.pdf')

    try {
      setSubmitting(true)
      setEnqueueError(null)

      const res = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileKey, filename })
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Impossible de démarrer le traitement')
      }

      const id = json?.id || json?.jobId
      if (!id) {
        throw new Error('Réponse invalide du serveur (id manquant)')
      }

      router.push(`/ebook/${id}`)
    } catch (e: any) {
      setEnqueueError(e?.message || 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-page py-10">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">
          Améliorer un PDF
        </h1>
        <p className="text-slate-600 mb-6">
          Dépose ton PDF ci-dessous. On l’analyse, on le nettoie, on illustre et on te propose les exports (Markdown, HTML, EPUB, PDF).
        </p>

        <UploadZone disabled={submitting} onUploaded={handleUploaded} />

        {enqueueError && (
          <div className="mt-4 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {enqueueError}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-800 mb-3">Traitements récents</h3>
        <JobsPanel />
      </section>
    </div>
  )
}

export default HomePageClient
