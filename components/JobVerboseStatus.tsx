'use client'
import React, { useState } from 'react'
import type { JobStatus } from '@/lib/status'
import { deriveJobInfo } from '@/lib/ui/jobNarrative'
import { StepsProgress } from '@/components/StepsProgress'
import { ProgressBar } from '@/components/ProgressBar'

export function JobVerboseStatus({ job }: { job: JobStatus }) {
  const [showRaw, setShowRaw] = useState(false)
  const info = deriveJobInfo(job)

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {job.filename || 'Document'}
            </h2>
            <p className="text-xs text-slate-500 break-all">
              ID: {job.id}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-xs font-medium ${info.failed ? 'text-red-600' : 'text-slate-600'}`}> 
              {info.shortLabel} · {info.percent}%
            </div>
            <div className="mt-1 w-40">
              <ProgressBar value={info.percent} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm leading-relaxed">
          <p className="font-medium mb-1">Ce que je fais:</p>
          <p>{info.narrative}</p>
          {info.failed && (
            <p className="mt-2 text-red-600 font-medium">
              Consulte les logs ci‑dessous pour le détail.
            </p>
          )}
        </div>

        <div>
          <StepsProgress steps={job.steps} />
        </div>

        <div className="flex gap-3 text-xs">
          <button
            onClick={() => setShowRaw(v => !v)}
            className="px-2 py-1 rounded border bg-white hover:bg-slate-50"
          >
            {showRaw ? 'Masquer JSON brut' : 'Voir JSON brut'}
          </button>
        </div>
        {showRaw && (
          <pre className="text-[11px] bg-slate-900 text-slate-100 rounded p-3 overflow-auto max-h-72">
            {JSON.stringify(job, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-medium mb-3">Journal (temps réel)</h3>
        <div className="space-y-1 max-h-72 overflow-auto text-xs font-mono leading-relaxed">
          {job.logs.slice().reverse().map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-400 shrink-0 w-16">
                {new Date(l.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={
                  l.level === 'error'
                    ? 'text-red-500'
                    : l.level === 'warn'
                    ? 'text-amber-600'
                    : 'text-slate-700'
                }
              >
                {l.level.toUpperCase()} {l.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-medium mb-3">Sorties</h3>
        {Object.entries(job.outputs || {}).length === 0 && (
          <p className="text-xs text-slate-500">Aucune sortie disponible pour l’instant.</p>
        )}
        <ul className="text-xs space-y-1">
          {Object.entries(job.outputs || {}).map(([k, v]) => (
            <li key={k}>
              <span className="font-medium">{k}: </span>
              <a
                href={v as string}
                target="_blank"
                className="text-blue-600 hover:underline break-all"
              >
                {v as string}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}