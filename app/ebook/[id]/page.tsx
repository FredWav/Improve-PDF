'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProgressSteps from '../../../components/ProgressSteps'
import DownloadCard from '../../../components/DownloadCard'

interface JobStatus {
  id: string
  steps: {
    extract: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    normalize: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    rewrite: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    images: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    render: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  }
  outputs: {
    md?: string
    html?: string
    pdf?: string
    epub?: string
    report?: string
  }
  logs: Array<{
    timestamp: string
    level: 'info' | 'warn' | 'error'
    message: string
  }>
  updatedAt: string
  filename?: string
}

export default function EbookStatusPage() {
  const params = useParams()
  const id = params.id as string
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/status/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch status')
        }
        const data = await response.json()
        setStatus(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Poll for updates every 5 seconds if not completed
    const interval = setInterval(() => {
      if (status?.steps.render !== 'COMPLETED' && status?.steps.render !== 'FAILED') {
        fetchStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [id, status?.steps.render])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-4 py-2 font-medium text-sm text-blue-600 bg-blue-100 rounded-md">
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading status...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Job not found</h2>
        <p className="text-gray-600 mt-2">The requested job ID does not exist.</p>
      </div>
    )
  }

  const isCompleted = status.steps.render === 'COMPLETED'
  const hasFailed = Object.values(status.steps).some(step => step === 'FAILED')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Ebook Processing Status
        </h1>
        {status.filename && (
          <p className="text-gray-600">
            Processing: <span className="font-medium">{status.filename}</span>
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Processing Progress</h2>
          <ProgressSteps steps={status.steps} />
        </div>

        {/* Download Links */}
        {isCompleted && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Download Results</h2>
            <DownloadCard outputs={status.outputs} jobId={id} />
          </div>
        )}

        {/* Error State */}
        {hasFailed && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
            <div className="mt-2 text-sm text-red-700">
              One or more processing steps failed. Check the logs below for details.
            </div>
          </div>
        )}

        {/* Logs */}
        {status.logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Processing Logs</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {status.logs.map((log, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded font-mono ${
                    log.level === 'error' ? 'bg-red-50 text-red-700' :
                    log.level === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {' '}
                  <span className={`font-medium ${
                    log.level === 'error' ? 'text-red-600' :
                    log.level === 'warn' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  {' '}
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(status.updatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}