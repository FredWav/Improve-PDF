'use client'
import Link from 'next/link'
import { useRecentJobs } from '@/hooks/useRecentJobs'
import { deriveJobInfo } from '@/lib/ui/jobNarrative'
import { ProgressBar } from '@/components/ProgressBar'

type AnyJob = Record<string, any>

// Fallbacks d’affichage si jamais le helper ne donne pas tout
function fallbackPercent(status?: string) {
  switch (status) {
    case 'succeeded': return 100
    case 'failed': return 100
    case 'processing': return 50
    case 'queued': return 10
    default: return 0
  }
}

export function JobsPanel() {
  const { jobs, error } = useRecentJobs()

  if (error) {
    return <div className="text-sm text-red-500">Erreur chargement jobs: {error}</div>
  }

  if (!jobs.length) {
    return <div className="text-sm text-slate-500">Aucun job récent.</div>
  }

  return (
    <div className="space-y-4">
      {jobs.map((raw: AnyJob) => {
        // Harmonise le nom de fichier (fileName -> filename)
        const filename = raw.filename ?? raw.fileName ?? ''
        const job: AnyJob = { ...raw, filename }

        // On laisse le helper faire son taf, mais on prévoit des fallbacks clean
        const info = deriveJobInfo(job as any) as Partial<{
          percent: number
          narrative: string
          completedSteps: number
          totalSteps: number
          failed: boolean
        }>

        const percent = typeof info.percent === 'number'
          ? info.percent
          : fallbackPercent(job.status)

        const completed = typeof info.completedSteps === 'number' ? info.completedSteps : 0
        const total = typeof info.totalSteps === 'number' ? info.totalSteps : 5
        const failed = Boolean(info.failed)
        const narrative = info.narrative ?? ''

        return (
          <div
            key={job.id}
            className="border rounded-md p-4 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm truncate max-w-[60%]">
                {filename || job.id}
              </div>
              <Link
                href={`/ebook/${job.id}`}
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                Ouvrir
              </Link>
            </div>

            <div className="mb-2">
              <ProgressBar value={percent} />
            </div>

            {narrative && (
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {narrative}
              </p>
            )}

            <div className="mt-1 text-[11px] text-slate-400">
              {completed}/{total} étapes
              {failed && <span className="text-red-600 font-semibold ml-2">Échec</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
