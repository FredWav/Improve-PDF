'use client'
import Link from 'next/link'
import { useRecentJobs } from '@/hooks/useRecentJobs'
import { deriveJobInfo } from '@/lib/ui/jobNarrative'
import { ProgressBar } from '@/components/ProgressBar'

type AnyJob = Record<string, any>

function StatusBadge({ failed, percent }: { failed: boolean; percent: number }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium'
  if (failed) return <span className={`${base} bg-red-50 text-red-700 ring-1 ring-red-200`}>Échec</span>
  if (percent === 100) return <span className={`${base} bg-green-50 text-green-700 ring-1 ring-green-200`}>Terminé</span>
  return <span className={`${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`}>En cours</span>
}

export function JobsPanel() {
  const { jobs, error } = useRecentJobs()

  // 404 -> on traite comme "aucun job"
  if (error && String(error).includes('404')) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
        Aucun job récent pour l’instant.
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        Impossible de charger les jobs récents pour le moment.
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
        Aucun job récent pour l’instant.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((raw: AnyJob) => {
        const filename = raw.filename ?? raw.fileName ?? ''
        const job: AnyJob = { ...raw, filename }

        const info = deriveJobInfo(job as any) as Partial<{
          percent: number
          narrative: string
          completedSteps: number
          totalSteps: number
          failed: boolean
        }>

        const percent = typeof info.percent === 'number' ? info.percent : 0
        const narrative = info.narrative ?? ''
        const completed = typeof info.completedSteps === 'number' ? info.completedSteps : 0
        const total = typeof info.totalSteps === 'number' ? info.totalSteps : 5
        const failed = Boolean(info.failed)

        return (
          <div
            key={job.id}
            className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-slate-800 truncate max-w-[60vw]">
                    {filename || job.id}
                  </div>
                  <StatusBadge failed={failed} percent={percent} />
                </div>
                {narrative && (
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{narrative}</p>
                )}
              </div>
              <Link
                href={`/ebook/${job.id}`}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline shrink-0"
              >
                Ouvrir
              </Link>
            </div>

            <div className="mt-3">
              <ProgressBar value={percent} />
              <div className="mt-1 text-[11px] text-slate-400">
                {completed}/{total} étapes
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
