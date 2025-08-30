'use client'
import Link from 'next/link'
import { useRecentJobs } from '@/hooks/useRecentJobs'
import { deriveJobInfo } from '@/lib/ui/jobNarrative'
import { ProgressBar } from '@/components/ProgressBar'

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
      {jobs.map(job => {
        const info = deriveJobInfo(job)
        return (
          <div
            key={job.id}
            className="border rounded-md p-4 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm truncate max-w-[60%]">
                {job.filename || job.id}
              </div>
              <Link
                href={`/ebook/${job.id}`}
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                Ouvrir
              </Link>
            </div>
            <div className="mb-2">
              <ProgressBar value={info.percent} />
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-2">
              {info.narrative}
            </p>
            <div className="mt-1 text-[11px] text-slate-400">
              {info.completedSteps}/{info.totalSteps} étapes
              {info.failed && <span className="text-red-600 font-semibold ml-2">Échec</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}