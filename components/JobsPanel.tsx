'use client'
import React, { useEffect, useState } from 'react'
import { fetchJobs, JobInfo } from '@/lib/jobsClient'
import { JobStatusBadge } from './JobStatusBadge'
import { t } from '@/lib/i18n'

export function JobsPanel() {
  const [jobs, setJobs] = useState<JobInfo[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await fetchJobs()
      setJobs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="text-sm text-slate-500">Chargement…</div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-sm text-slate-500">{t('job.none')}</div>
    )
  }

  return (
    <ul className="divide-y divide-slate-200 border rounded-md bg-white">
      {jobs.map(job => (
        <li key={job.id} className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">
              {job.filename || '(sans nom)'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{job.id}</div>
          </div>
          <JobStatusBadge status={job.status} />
        </li>
      ))}
    </ul>
  )
}