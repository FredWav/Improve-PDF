'use client'
import React, { useCallback, useState } from 'react'
import { t } from '@/lib/i18n'

interface UploadZoneProps {
  onUploaded: (data: any) => void
  className?: string
}

export function UploadZone({ onUploaded, className = '' }: UploadZoneProps) {
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      onUploaded(json)
    } catch (e: any) {
      setError(e.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [onUploaded])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-lg px-6 py-10 text-center cursor-pointer transition
        ${drag ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'}
        ${loading ? 'opacity-70' : ''} ${className}`}
      onClick={() => document.getElementById('file-input-zone')?.click()}
      role="button"
      aria-label={t('actions.upload')}
    >
      <input
        id="file-input-zone"
        type="file"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
      />
      <div className="font-medium text-slate-700">
        {t('upload.dropHere')}
      </div>
      <div className="mt-2 text-sm text-slate-500">
        {t('actions.selectFile')}
      </div>
      {loading && <div className="mt-4 text-sm text-slate-600 animate-pulse">{t('upload.inProgress')}</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
    </div>
  )
}