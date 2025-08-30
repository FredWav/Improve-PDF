'use client'
import React, { useCallback, useState } from 'react'

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
        onDragOver={(e) => { e.preventDefault(); if (!effectiveDisabled) setDrag(true) }}
        onDragLeave={() => { if (!effectiveDisabled) setDrag(false) }}
        onDrop={onDrop}
        onClick={() => { if (!effectiveDisabled) document.getElementById('file-input-zone')?.click() }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !effectiveDisabled) document.getElementById('file-input-zone')?.click() }}
        tabIndex={0}
        role="button"
        aria-disabled={effectiveDisabled}
        className={[
          'relative grid place-items-center h-56 w-full rounded-2xl border-2 border-dashed bg-white/80 backdrop-blur-sm',
          'transition-all duration-200 ease-out ring-1 ring-black/5 shadow-sm',
          drag ? 'border-blue-400 bg-blue-50/60 ring-blue-200 cursor-copy' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer',
          effectiveDisabled ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
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
          {/* Icône */}
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center ring-1 ring-slate-200">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden className="opacity-90">
              <path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.6A3.5 3.5 0 0 0 7 18Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12v6m0 0l-2.5-2.5M12 18l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="text-[15px] font-semibold text-slate-800">
            Glissez-déposez votre fichier ici
          </div>
          <div className="mt-1 text-sm text-slate-500">
            ou
          </div>

          {/* Beau bouton arrondi */}
          <button
            type="button"
            className="mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm
                       bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 active:scale-[.99] transition"
            onClick={(e) => {
              e.stopPropagation()
              document.getElementById('file-input-zone')?.click()
            }}
          >
            Choisir un fichier
          </button>

          <div className="mt-3 text-[11px] text-slate-400">
            PDF uniquement<span className="mx-1">•</span>Max. 50 Mo
          </div>
        </div>

        {/* Aura bleue au survol/drag */}
        <div className={[
          'absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-200',
          drag ? 'opacity-100 ring-2 ring-blue-400/60' : 'opacity-0'
        ].join(' ')} />
      </div>

      {loading && (
        <div className="mt-3 text-sm text-slate-600 animate-pulse">
          Téléversement en cours…
        </div>
      )}
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  )
}
