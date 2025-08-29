import { uploadJSON, getJSON, uploadText } from './blob'

export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface JobStatus {
  id: string
  filename?: string
  steps: {
    extract: StepStatus
    normalize: StepStatus
    rewrite: StepStatus
    images: StepStatus
    render: StepStatus
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
  createdAt: string
  updatedAt: string
  inputFile?: string
  metadata?: {
    originalSize?: number
    pageCount?: number
    processingTime?: number
    aiTokensUsed?: number
    imagesGenerated?: number
  }
}

/**
 * Create a new job manifest with initial status
 */
export async function createJobStatus(id: string, filename?: string, inputFile?: string): Promise<JobStatus> {
  const now = new Date().toISOString()
  
  const status: JobStatus = {
    id,
    filename,
    steps: {
      extract: 'PENDING',
      normalize: 'PENDING',
      rewrite: 'PENDING',
      images: 'PENDING',
      render: 'PENDING',
    },
    outputs: {},
    logs: [{
      timestamp: now,
      level: 'info',
      message: `Job ${id} created${filename ? ` for file: ${filename}` : ''}`
    }],
    createdAt: now,
    updatedAt: now,
    inputFile,
    metadata: {}
  }

  await saveJobStatus(status)
  return status
}

/**
 * Save job status to blob storage
 */
export async function saveJobStatus(status: JobStatus): Promise<void> {
  status.updatedAt = new Date().toISOString()
  
  const filename = `jobs/${status.id}/manifest.json`
  await uploadJSON(status, filename)
}

/**
 * Load job status from blob storage
 */
export async function loadJobStatus(id: string): Promise<JobStatus | null> {
  try {
    const filename = `jobs/${id}/manifest.json`
    // Construct the expected blob URL
    const url = `https://blob.vercel-storage.com/${filename}`
    
    const status = await getJSON<JobStatus>(url)
    return status
  } catch (error) {
    console.error(`Failed to load job status for ${id}:`, error)
    return null
  }
}

/**
 * Update a specific step status
 */
export async function updateStepStatus(
  id: string, 
  step: keyof JobStatus['steps'], 
  status: StepStatus,
  message?: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  jobStatus.steps[step] = status
  
  if (message) {
    jobStatus.logs.push({
      timestamp: new Date().toISOString(),
      level: status === 'FAILED' ? 'error' : 'info',
      message: `Step ${step}: ${message}`
    })
  }

  await saveJobStatus(jobStatus)
}

/**
 * Add output file URL to job status
 */
export async function addJobOutput(
  id: string, 
  outputType: keyof JobStatus['outputs'], 
  url: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  jobStatus.outputs[outputType] = url
  
  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Output generated: ${outputType} -> ${url}`
  })

  await saveJobStatus(jobStatus)
}

/**
 * Add a log entry to the job
 */
export async function addJobLog(
  id: string, 
  level: 'info' | 'warn' | 'error', 
  message: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level,
    message
  })

  await saveJobStatus(jobStatus)
}

/**
 * Update job metadata
 */
export async function updateJobMetadata(
  id: string, 
  metadata: Partial<JobStatus['metadata']>
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  jobStatus.metadata = { ...jobStatus.metadata, ...metadata }
  await saveJobStatus(jobStatus)
}

/**
 * Mark a job as completed
 */
export async function completeJob(id: string): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  // Mark all remaining steps as completed if they're not failed
  Object.keys(jobStatus.steps).forEach(step => {
    const stepKey = step as keyof JobStatus['steps']
    if (jobStatus.steps[stepKey] === 'PENDING' || jobStatus.steps[stepKey] === 'RUNNING') {
      jobStatus.steps[stepKey] = 'COMPLETED'
    }
  })

  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Job completed successfully'
  })

  await saveJobStatus(jobStatus)
}

/**
 * Mark a job as failed
 */
export async function failJob(id: string, error: string, step?: keyof JobStatus['steps']): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) {
    throw new Error(`Job ${id} not found`)
  }

  if (step) {
    jobStatus.steps[step] = 'FAILED'
  }

  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `Job failed: ${error}`
  })

  await saveJobStatus(jobStatus)
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `job-${timestamp}-${random}`
}

/**
 * Get all jobs (for admin/debugging purposes)
 */
export async function listJobs(limit = 50): Promise<JobStatus[]> {
  // This would need to be implemented based on Vercel Blob's listing capabilities
  // For now, return empty array as we don't have a global job index
  return []
}

/**
 * Save intermediate processing data
 */
export async function saveProcessingData(
  jobId: string, 
  step: string, 
  data: string, 
  filename: string
): Promise<string> {
  const fullFilename = `jobs/${jobId}/${step}/${filename}`
  const result = await uploadText(data, fullFilename)
  
  await addJobLog(jobId, 'info', `Saved ${step} data: ${filename}`)
  
  return result.url
}