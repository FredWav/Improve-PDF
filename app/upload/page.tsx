'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UploadArea from '../../components/UploadArea'

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Upload vers /api/upload
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadJson = await uploadResponse.json().catch(() => ({} as any))
      if (!uploadResponse.ok) {
        throw new Error(uploadJson?.error || 'Échec de l’upload du fichier')
      }

      const fileKey = uploadJson?.pathname || uploadJson?.fileId || uploadJson?.url
      if (!fileKey) {
        throw new Error('La réponse du serveur ne contient pas de clé de fichier (pathname).')
      }

      // Démarrage du job (⚠ l’API attend fileKey | pathname | url, PAS fileId)
      const enqueueResponse = await fetch('/api/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey, filename: file.name }),
      })

      const enqueueJson = await enqueueResponse.json().catch(() => ({} as any))
      if (!enqueueResponse.ok) {
        throw new Error(enqueueJson?.error || 'Impossible de démarrer le traitement')
      }

      const jobId = enqueueJson?.id || enqueueJson?.jobId
      if (!jobId) {
        throw new Error('Réponse invalide du serveur (id manquant)')
      }

      router.push(`/ebook/${jobId}`)
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your PDF
        </h1>
        <p className="text-gray-600">
          Upload a PDF document to start the improvement process. 
          We support documents up to {process.env.MAX_PDF_PAGES || 500} pages.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <UploadArea
          onFileSelect={handleFileUpload}
          disabled={isUploading}
          accept=".pdf"
        />

        {isUploading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 font-medium text-sm text-blue-600 bg-blue-100 rounded-md">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l3 3-3 3v-4a8 8 0 01-8-8z" />
              </svg>
              Uploading and starting processing...
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 text-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
