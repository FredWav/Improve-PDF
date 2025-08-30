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

  return (
    <div className={className}>
      <div
        onDragOver={e => { e.preventDefault(); if (!effectiveDisabled) setDrag(true) }}
        onDragLeave={() => { if (!effectiveDisabled) setDrag(false) }}
        onDrop={onDrop}
        onClick={() => { if (!effectiveDisabled) document.getElementById('file-input-zone')?.click() }}
        className={[
          'group grid place-items-center h-48 w-full rounded-xl border-2 border-dashed bg-white',
          'transition-all duration-200',
          drag ? 'border-blue-400 bg-blue-50/60' : 'border-slate-300 hover:border-slate-400',
          effectiveDisabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
        ].join(' ')}
        role="button"
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

        <div className="text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-50 ring-1 ring-slate-200 grid place-items-center">
            {/* cloud icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" className="opacity-80">
              <path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.6A3.5 3.5 0 0 0 7 18Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12v6m0 0l-2.5-2.5M12 18l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-[15px] font-semibold text-slate-800">
            {t('upload.dropHere') || 'Glissez-déposez votre fichier ici'}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {t('actions.selectFile') || 'Cliquer pour sélectionner'}
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            PDF uniquement<span className="mx-1">•</span>Max. 50 Mo
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3 text-sm text-slate-600 animate-pulse">
          {t('upload.inProgress') || 'Téléversement en cours…'}
        </div>
      )}
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  )
}
