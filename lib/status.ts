import { uploadJSON, getJSON, uploadText } from './blob'

export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface JobOutputs {
  rawText?: string
  normalizedText?: string
  rewrittenText?: string
  renderedHtml?: string
  renderedMarkdown?: string
  pdfOutput?: string
  md?: string
  html?: string
  pdf?: string
  epub?: string
  report?: string
}

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
  outputs: JobOutputs
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

const MANIFEST_PATH = (id: string) => `jobs/${id}/manifest.json`

export async function createJobStatus(
  id: string,
  filename?: string,
  inputFile?: string
): Promise<JobStatus> {
  const now = new Date().toISOString()
  const status: JobStatus = {
    id,
    filename,
    steps: {
      extract: 'PENDING',
      normalize: 'PENDING',
      rewrite: 'PENDING',
      images: 'PENDING',
      render: 'PENDING'
    },
    outputs: {},
    logs: [
      {
        timestamp: now,
        level: 'info',
        message: `Job ${id} created${filename ? ` for file: ${filename}` : ''}`
      }
    ],
    createdAt: now,
    updatedAt: now,
    inputFile,
    metadata: {}
  }
  await saveJobStatus(status)
  return status
}

export async function saveJobStatus(status: JobStatus): Promise<void> {
  status.updatedAt = new Date().toISOString()
  await uploadJSON(status, {
    key: MANIFEST_PATH(status.id),
    addTimestamp: false
  })
}

export async function loadJobStatus(id: string): Promise<JobStatus | null> {
  try {
    return await getJSON<JobStatus>(MANIFEST_PATH(id))
  } catch {
    return null
  }
}

export async function updateStepStatus(
  id: string,
  step: keyof JobStatus['steps'],
  statusValue: StepStatus,
  message?: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  jobStatus.steps[step] = statusValue
  if (message) {
    jobStatus.logs.push({
      timestamp: new Date().toISOString(),
      level: statusValue === 'FAILED' ? 'error' : 'info',
      message: `Step ${step}: ${message}`
    })
  }
  await saveJobStatus(jobStatus)
}

export async function addJobOutput(
  id: string,
  outputType: keyof JobStatus['outputs'],
  url: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  jobStatus.outputs[outputType] = url
  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Output generated: ${outputType} -> ${url}`
  })
  await saveJobStatus(jobStatus)
}

export async function addJobLog(
  id: string,
  level: 'info' | 'warn' | 'error',
  message: string
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level,
    message
  })
  await saveJobStatus(jobStatus)
}

export async function updateJobMetadata(
  id: string,
  metadata: Partial<JobStatus['metadata']>
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  jobStatus.metadata = { ...jobStatus.metadata, ...metadata }
  await saveJobStatus(jobStatus)
}

export async function completeJob(id: string): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  Object.keys(jobStatus.steps).forEach(k => {
    const key = k as keyof JobStatus['steps']
    if (jobStatus.steps[key] === 'PENDING' || jobStatus.steps[key] === 'RUNNING') {
      jobStatus.steps[key] = 'COMPLETED'
    }
  })
  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Job completed successfully'
  })
  await saveJobStatus(jobStatus)
}

export async function failJob(
  id: string,
  error: string,
  step?: keyof JobStatus['steps']
): Promise<void> {
  const jobStatus = await loadJobStatus(id)
  if (!jobStatus) throw new Error(`Job ${id} not found`)
  if (step) jobStatus.steps[step] = 'FAILED'
  jobStatus.logs.push({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `Job failed: ${error}`
  })
  await saveJobStatus(jobStatus)
}

export function generateJobId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `job-${timestamp}-${random}`
}

export async function listJobs(): Promise<JobStatus[]> {
  return []
}

export async function saveProcessingData(
  jobId: string,
  step: string,
  data: string,
  filename: string
): Promise<string> {
  const key = `jobs/${jobId}/${step}/${filename}`
  const result = await uploadText(data, {
    key,
    addTimestamp: false
  })
  await addJobLog(jobId, 'info', `Saved ${step} data: ${filename}`)
  return result.url
}