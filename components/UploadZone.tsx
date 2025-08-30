'use client'
import React, { useCallback, useState } from 'react'
import { t } from '@/lib/i18n'

interface UploadZoneProps {
  onUploaded: (data: any) => void | Promise<void>
  className?: string
  disabled?: boolean
}

export function UploadZone({ onUploaded, className = '', disabled = false }: UploadZoneProps) {
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveDisabled = disabled || loading

  const handleFile = useCallback(async (file: File) => {
    if (effectiveDisabled) return
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      await onUploaded(json)
    } catch (e: any) {
      setError(e?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [onUploaded, effectiveDisabled])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (effectiveDisabled) return
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (effectiveDisabled) return
    setDrag(true)
  }

  const onDragLeave = () => {
    if (effectiveDisabled) return
    setDrag(false)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        // carte verre dépoli
        'relative rounded-2xl border bg-white/70 backdrop-blur-sm',
        'border-slate-200 shadow-sm ring-1 ring-black/[0.02]',
        'transition-all duration-200',
        drag ? 'border-blue-400 ring-blue-200' : 'hover:shadow-md',
        effectiveDisabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer',
        'px-8 py-12 text-center',
        className
      ].join(' ')}
      onClick={() => {
        if (!effectiveDisabled) document.getElementById('file-input-zone')?.click()
      }}
      role="button"
      aria-label={t('actions.upload')}
      aria-disabled={effectiveDisabled}
    >
      <input
        id="file-input-zone"
        type="file"
        hidden
        disabled={effectiveDisabled}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
        accept=".pdf"
      />

      {/* Icône Upload en SVG (pas de lib externe) */}
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center ring-1 ring-slate-200">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden className="opacity-90">
          <path d="M12 16V7m0 0l-3.5 3.5M12 7l3.5 3.5M5 16.5a4.5 4.5 0 01.2-1.4 4.5 4.5 0 014.3-3.1h.5"
                stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 12a4 4 0 113.5 6H7.5A3.5 3.5 0 014 14.5 3.5 3.5 0 017.5 11" 
                stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h3 className="text-base font-semibold text-slate-800">
        {t('upload.dropHere') || 'Glissez-déposez votre PDF ici'}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {t('actions.selectFile') || 'Ou cliquez pour sélectionner'}
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
        <span>PDF uniquement</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>Max. 50 Mo</span>
      </div>

      {loading && (
        <div className="mt-6 text-sm text-slate-600 animate-pulse">
          {t('upload.inProgress') || 'Téléversement en cours…'}
        </div>
      )}
      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
    </div>
  )
}
