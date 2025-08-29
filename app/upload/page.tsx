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
      // Create form data for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload to Vercel Blob (server-side endpoint to handle token securely)
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const { fileId, url } = await uploadResponse.json()

      // Enqueue processing job
      const enqueueResponse = await fetch('/api/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, filename: file.name }),
      })

      if (!enqueueResponse.ok) {
        throw new Error('Failed to start processing')
      }

      const { jobId } = await enqueueResponse.json()

      // Redirect to status page
      router.push(`/ebook/${jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading and starting processing...
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Processing Information</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Processing time varies based on document length and complexity</li>
                <li>You'll be able to track progress in real-time</li>
                <li>AI improvements preserve original meaning (≥98% length retention)</li>
                <li>All generated images include proper licensing attribution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}