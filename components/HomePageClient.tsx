'use client'

import { UploadZone } from '@/components/UploadZone'
import { JobsPanel } from '@/components/JobsPanel'
import { t } from '@/lib/i18n'

export function HomePageClient() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">
          Improve PDF
        </h1>
      </header>

      <section className="grid md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-4">{t('actions.upload')}</h2>
            <UploadZone
              onUploaded={async (data) => {
                try {
                  await fetch('/api/enqueue', {
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
                } catch (e) {
                  console.error(e)
                }
              }}
            />
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>Le fichier est traité étape par étape (extraction, amélioration, export…).</p>
            <p>Vous pouvez rester sur cette page, la liste se met à jour automatiquement.</p>
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