
import { uploadJSON, getJSON, uploadText } from '@/lib/blob'

export type Step = 'extract' | 'normalize' | 'rewrite' | 'images' | 'render'
export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface JobStatus {
  id: string
  createdAt: string
  updatedAt: string
  fileKey?: string
  steps: Record<Step, StepStatus>
  logs: { timestamp: string; level: 'info'|'warn'|'error'; message: string }[]
  outputs: Partial<Record<'rawText'|'normalizedText'|'rewrittenText'|'html'|'pdf'|'md', string>>
}

export function generateJobId() {
  const ts = Date.now()
  const rnd = Math.random().toString(36).slice(2,8)
  return `job-${ts}-${rnd}`
}

export async function createJobStatus(id: string, fileKey?: string): Promise<JobStatus> {
  const now = new Date().toISOString()
  const status: JobStatus = {
    id,
    createdAt: now,
    updatedAt: now,
    fileKey,
    steps: { extract:'PENDING', normalize:'PENDING', rewrite:'PENDING', images:'PENDING', render:'PENDING' },
    logs: [],
    outputs: {}
  }
  await uploadJSON(status, { key: `jobs/${id}/manifest.json`, addTimestamp: false, allowOverwrite: true })
  await appendIndex(id)
  return status
}

export async function saveJobStatus(status: JobStatus) {
  status.updatedAt = new Date().toISOString()
  await uploadJSON(status, { key: `jobs/${status.id}/manifest.json`, addTimestamp: false, allowOverwrite: true })
}

export async function loadJobStatus(id: string): Promise<JobStatus> {
  return getJSON<JobStatus>(`jobs/${id}/manifest.json`)
}

export async function getJobOrThrow(id: string): Promise<JobStatus> {
  try { return await loadJobStatus(id) } catch { throw new Error('Unknown job id') }
}

export async function updateStepStatus(id: string, step: Step, newStatus: StepStatus) {
  const js = await getJobOrThrow(id)
  js.steps[step] = newStatus
  await saveJobStatus(js)
}

export async function addJobLog(id: string, level: 'info'|'warn'|'error', message: string) {
  const js = await getJobOrThrow(id)
  js.logs.push({ timestamp: new Date().toISOString(), level, message })
  await saveJobStatus(js)
}

export async function saveProcessingData(jobId: string, step: string, data: string, filename: string) {
  const key = `jobs/${jobId}/${step}/${filename}`
  const res = await uploadText(data, { key, addTimestamp: false, allowOverwrite: true })
  await addJobLog(jobId, 'info', `Saved ${step} data: ${filename}`)
  return res.url
}

export async function addJobOutput(id: string, type: 'rawText'|'normalizedText'|'rewrittenText'|'html'|'pdf'|'md', url: string) {
  const js = await getJobOrThrow(id)
  js.outputs[type] = url
  await saveJobStatus(js)
}

// ---- Simple index of recent jobs ----
async function appendIndex(id: string) {
  try {
    const url = await saveProcessingData(id, 'meta', id, 'index-touch.txt')
  } catch {}
}
