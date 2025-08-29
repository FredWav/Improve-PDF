'use client'
import { t } from '@/lib/i18n'

const mapping: Record<string, { label: string; cls: string }> = {
  queued: { label: t('job.status.QUEUED'), cls: 'bg-slate-100 text-slate-700' },
  QUEUED: { label: t('job.status.QUEUED'), cls: 'bg-slate-100 text-slate-700' },
  RUNNING: { label: t('job.status.RUNNING'), cls: 'bg-blue-100 text-blue-700' },
  extract: { label: t('job.status.EXTRACTING'), cls: 'bg-blue-100 text-blue-700' },
  EXTRACTING: { label: t('job.status.EXTRACTING'), cls: 'bg-blue-100 text-blue-700' },
  FAILED: { label: t('job.status.FAILED'), cls: 'bg-red-100 text-red-700' },
  DONE: { label: t('job.status.DONE'), cls: 'bg-green-100 text-green-700' }
}

export function JobStatusBadge({ status }: { status: string }) {
  const entry = mapping[status] || { label: status, cls: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${entry.cls}`}>  
      {entry.label}
    </span>
  )
}