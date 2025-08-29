interface DownloadCardProps {
  outputs: {
    md?: string
    html?: string
    pdf?: string
    epub?: string
    report?: string
  }
  jobId: string
}

export default function DownloadCard({ outputs, jobId }: DownloadCardProps) {
  const downloadItems = [
    {
      key: 'pdf',
      title: 'Ebook PDF',
      description: 'Professional PDF with improved typography and illustrations',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      color: 'text-red-600 bg-red-50'
    },
    {
      key: 'epub',
      title: 'EPUB Format',
      description: 'Compatible with e-readers and reading apps',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'text-green-600 bg-green-50'
    },
    {
      key: 'html',
      title: 'HTML Preview',
      description: 'Web-friendly version for online viewing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-50'
    },
    {
      key: 'md',
      title: 'Markdown Source',
      description: 'Raw markdown with improvements for further editing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-gray-600 bg-gray-50'
    },
    {
      key: 'report',
      title: 'Audit Report',
      description: 'Detailed analysis, changes, and image licensing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-50'
    }
  ]

  const handleDownload = async (type: string) => {
    try {
      const response = await fetch(`/api/download/${jobId}/${type}`)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      
      // Set appropriate filename based on type
      const extensions: Record<string, string> = {
        pdf: 'pdf',
        epub: 'epub',
        html: 'html',
        md: 'md',
        report: 'pdf'
      }
      
      a.download = `ebook-${jobId}.${extensions[type] || 'bin'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      // TODO: Show error toast
    }
  }

  const handleDownloadAll = async () => {
    try {
      const response = await fetch(`/api/download/${jobId}/all`)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `ebook-${jobId}-complete.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download all failed:', error)
      // TODO: Show error toast
    }
  }

  const availableOutputs = downloadItems.filter(item => outputs[item.key as keyof typeof outputs])

  return (
    <div className="space-y-4">
      {/* Download All Button */}
      {availableOutputs.length > 1 && (
        <div className="flex justify-center pb-4 border-b">
          <button
            onClick={handleDownloadAll}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download All (ZIP)
          </button>
        </div>
      )}

      {/* Individual Download Items */}
      <div className="grid gap-4 md:grid-cols-2">
        {availableOutputs.map((item) => (
          <div
            key={item.key}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleDownload(item.key)}
          >
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${item.color}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {item.description}
                </p>
                <div className="mt-2">
                  <button className="text-xs font-medium text-blue-600 hover:text-blue-500">
                    Download →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {availableOutputs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No outputs available for download yet.
        </div>
      )}
    </div>
  )
}