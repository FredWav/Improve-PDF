'use client'
import React from 'react'

const ORDER: Array<{ key: string; label: string }> = [
  { key: 'extract', label: 'Extraction' },
  { key: 'normalize', label: 'Normalisation' },
  { key: 'rewrite', label: 'Réécriture' },
  { key: 'images', label: 'Images' },
  { key: 'render', label: 'Rendu' }
]

function statusColor(status?: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-500'
    case 'RUNNING':
      return 'bg-blue-500 animate-pulse'
    case 'FAILED':
      return 'bg-red-500'
    default:
      return 'bg-slate-300'
  }
}

export function StepsProgress({ steps }: { steps?: Record<string, string> }) {
  return (
    <ol className="space-y-2" aria-label="Étapes du traitement">
      {ORDER.map(step => {
        const st = steps?.[step.key] || 'PENDING'
        return (
          <li key={step.key} className="flex items-center">
            <span
              className={`w-3 h-3 rounded-full mr-3 ${statusColor(st)}`}
              aria-label={`${step.label}: ${st}`}
            />
            <span className="text-sm font-medium flex-1">
              {step.label}
            </span>
            <span className="text-xs text-slate-500">{st}</span>
          </li>
        )
      })}
    </ol>
  )
}