'use client'
import { UploadZone } from '@/components/UploadZone'
import { JobsPanel } from '@/components/JobsPanel'
import { t } from '@/lib/i18n'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HomePageClient() {
  const [enqueueError, setEnqueueError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">
          Improve PDF
        </h1>
      </header>

      <section className="grid md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4">{t('actions.upload')}</h2>
            <UploadZone
              disabled={submitting}
              onUploaded={async (data) => {
                setSubmitting(true)
                setEnqueueError(null)
                try {
                  const res = await fetch('/api/enqueue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fileId: data.fileId || data.pathname,
                      filename:
                        data.originalName ||
                        data.filename ||
                        data.pathname
                    })
                  })
                  if (!res.ok) {
                    throw new Error(await res.text())
                  }
                  const json = await res.json()
                  // Rediriger directement vers la page détaillée verbueuse
                  if (json.jobId) {
                    router.push(`/ebook/${json.jobId}`)
                  }
                } catch (e: any) {
                  setEnqueueError(e.message || 'Erreur envoi')
                } finally {
                  setSubmitting(false)
                }
              }}
            />
            {enqueueError && (
              <p className="mt-3 text-xs text-red-600">{enqueueError}</p>
            )}
            {submitting && (
              <p className="mt-3 text-xs text-blue-600 animate-pulse">
                Création du job et initialisation…
              </p>
            )}
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>Interface personnelle: chaque étape t’explique ce qu’elle fait.</p>
            <p>Tu peux ouvrir un job pour voir les détails narratifs en direct.</p>
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          <h2 className="text-lg font-medium">{t('job.recent')}</h2>
          <JobsPanel />
        </div>
      </section>
    </main>
  )
}