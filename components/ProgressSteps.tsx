interface ProgressStepsProps {
  steps: {
    extract: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    normalize: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    rewrite: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    images: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    render: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  }
}

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  const stepDefinitions = [
    {
      key: 'extract' as const,
      title: 'Text Extraction',
      description: 'Extracting text from PDF with OCR if needed'
    },
    {
      key: 'normalize' as const,
      title: 'Text Normalization',
      description: 'Fixing typography and formatting'
    },
    {
      key: 'rewrite' as const,
      title: 'Content Improvement',
      description: 'AI enhancement while preserving meaning'
    },
    {
      key: 'images' as const,
      title: 'Image Generation',
      description: 'Adding relevant illustrations with licensing'
    },
    {
      key: 'render' as const,
      title: 'Final Rendering',
      description: 'Generating HTML, PDF, and EPUB formats'
    }
  ]

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'RUNNING':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'FAILED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
      default: // PENDING
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-4">
      {stepDefinitions.map((step, index) => {
        const status = steps[step.key]
        const isCompleted = status === 'COMPLETED'
        const isRunning = status === 'RUNNING'
        const isFailed = status === 'FAILED'
        const isPending = status === 'PENDING'

        return (
          <div
            key={step.key}
            className={`progress-step ${
              isCompleted ? 'completed' :
              isRunning ? 'running' :
              isFailed ? 'failed' :
              'pending'
            }`}
          >
            <div className="flex-shrink-0">
              {getStepIcon(status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {step.title}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  isCompleted ? 'bg-green-100 text-green-800' :
                  isRunning ? 'bg-blue-100 text-blue-800' :
                  isFailed ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {step.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}