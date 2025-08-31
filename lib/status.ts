import { uploadJSON, getJSON, uploadText } from './blob'
import { appendJobId } from './jobIndex'

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
  // 👇 ajouts non-breaking pour images & QA
  imagesManifest?: string
  rewriteMap?: string
  toc?: string
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

// Reduced retry attempts for faster failures
const RETRY_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 50

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function loadJobStatusOnce(id: string): Promise<JobStatus | null> {
  try {
    return await getJSON<JobStatus>(MANIFEST_PATH(id))
  } catch (err) {
    console.log(`Failed to load job ${id}:`, err instanceof Error ? err.message : String(err))
    return null
  }
}

async function getJobOrThrow(id: string): Promise<JobStatus> {
  console.log(`Attempting to load job ${id}`)
  
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    const job = await loadJobStatusOnce(id)
    if (job) {
      console.log(`Successfully loaded job ${id} on attempt ${attempt + 1}`)
      return job
    }
    
    if (attempt < RETRY_ATTEMPTS - 1) {
      const delay = RETRY_BASE_DELAY_MS * (attempt + 1)
      console.log(`Job ${id} not found, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_ATTEMPTS})`)
      await sleep(delay)
    }
  }
  
  console.error(`Job ${id} not found after ${RETRY_ATTEMPTS} attempts`)
  throw new Error(`Job ${id} not found after ${RETRY_ATTEMPTS} attempts`)
}

export async function createJobStatus(
  id: string,
  filename?: string,
  inputFile?: string
): Promise<JobStatus> {
  const now = new Date().toISOString()
  
  console.log(`Creating job status for ${id}, filename: ${filename}, inputFile: ${inputFile}`)
  
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

  try {
    await saveJobStatus(status)
    console.log(`Job status saved for ${id}`)
    
    // Add to job index
    try {
      await appendJobId(id)
      console.log(`Job ${id} added to index`)
    } catch (indexError) {
      console.warn(`Failed to add job ${id} to index:`, indexError)
      // Non-fatal error
    }
    
    return status
  } catch (error) {
    console.error(`Failed to save job status for ${id}:`, error)
    throw error
  }
}

export async function saveJobStatus(status: JobStatus): Promise<void> {
  status.updatedAt = new Date().toISOString()
  
  try {
    await uploadJSON(status, {
      key: MANIFEST_PATH(status.id),
      addTimestamp: false,
      allowOverwrite: true
    })
    console.log(`Job status updated for ${status.id}`)
  } catch (error) {
    console.error(`Failed to save job status for ${status.id}:`, error)
    throw error
  }
}

export async function loadJobStatus(id: string): Promise<JobStatus | null> {
  return loadJobStatusOnce(id)
}

export async function updateStepStatus(
  id: string,
  step: keyof JobStatus['steps'],
  statusValue: StepStatus,
  message?: string
): Promise<void> {
  console.log(`Updating step ${step} to ${statusValue} for job ${id}`)
  
  try {
    const jobStatus = await getJobOrThrow(id)
    jobStatus.steps[step] = statusValue
    
    if (message) {
      jobStatus.logs.push({
        timestamp: new Date().toISOString(),
        level: statusValue === 'FAILED' ? 'error' : 'info',
        message: `Step ${step}: ${message}`
      })
    }
    
    await saveJobStatus(jobStatus)
    console.log(`Step ${step} updated to ${statusValue} for job ${id}`)
  } catch (error) {
    console.error(`Failed to update step ${step} for job ${id}:`, error)
    throw error
  }
}

export async function addJobOutput(
  id: string,
  outputType: keyof JobStatus['outputs'],
  url: string
): Promise<void> {
  console.log(`Adding output ${outputType} for job ${id}: ${url}`)
  
  try {
    const jobStatus = await getJobOrThrow(id)
    jobStatus.outputs[outputType] = url
    jobStatus.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Output generated: ${outputType} -> ${url}`
    })
    await saveJobStatus(jobStatus)
    console.log(`Output ${outputType} added for job ${id}`)
  } catch (error) {
    console.error(`Failed to add output ${outputType} for job ${id}:`, error)
    throw error
  }
}

export async function addJobLog(
  id: string,
  level: 'info' | 'warn' | 'error',
  message: string
): Promise<void> {
  try {
    const jobStatus = await getJobOrThrow(id)
    jobStatus.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    })
    await saveJobStatus(jobStatus)
  } catch (error) {
    console.error(`Failed to add log to job ${id}:`, error)
    // Don't re-throw log errors to avoid cascading failures
  }
}

export async function updateJobMetadata(
  id: string,
  metadata: Partial<JobStatus['metadata']>
): Promise<void> {
  try {
    const jobStatus = await getJobOrThrow(id)
    jobStatus.metadata = { ...jobStatus.metadata, ...metadata }
    await saveJobStatus(jobStatus)
  } catch (error) {
    console.error(`Failed to update metadata for job ${id}:`, error)
    throw error
  }
}

export async function completeJob(id: string): Promise<void> {
  try {
    const jobStatus = await getJobOrThrow(id)
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
    console.log(`Job ${id} completed`)
  } catch (error) {
    console.error(`Failed to complete job ${id}:`, error)
    throw error
  }
}

export async function failJob(
  id: string,
  error: string,
  step?: keyof JobStatus['steps']
): Promise<void> {
  try {
    const jobStatus = await getJobOrThrow(id)
    if (step) jobStatus.steps[step] = 'FAILED'
    jobStatus.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Job failed: ${error}`
    })
    await saveJobStatus(jobStatus)
    console.log(`Job ${id} failed: ${error}`)
  } catch (saveError) {
    console.error(`Failed to mark job ${id} as failed:`, saveError)
    throw saveError
  }
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
  console.log(`Saving processing data for job ${jobId}, step ${step}: ${key}`)
  
  try {
    const result = await uploadText(data, {
      key,
      addTimestamp: false,
      allowOverwrite: true
    })
    
    // Don't fail the whole operation if logging fails
    try {
      await addJobLog(jobId, 'info', `Saved ${step} data: ${filename}`)
    } catch (logError) {
      console.warn(`Failed to log data save for ${jobId}:`, logError)
    }
    
    console.log(`Processing data saved for job ${jobId}: ${result.url}`)
    return result.url
  } catch (error) {
    console.error(`Failed to save processing data for job ${jobId}:`, error)
    throw error
  }
}
