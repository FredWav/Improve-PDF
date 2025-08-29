import { uploadJSON, getJSON } from './blob'
import { loadJobStatus } from './status'

const INDEX_PATH = 'jobs/index.json'

async function loadIndex(): Promise<string[]> {
  try {
    const ids = await getJSON<string[]>(INDEX_PATH)
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export async function appendJobId(id: string) {
  const ids = await loadIndex()
  if (!ids.includes(id)) {
    ids.push(id)
    await uploadJSON(ids, { key: INDEX_PATH, addTimestamp: false })
  }
}

function deriveStatus(steps: Record<string, string>): string {
  const values = Object.values(steps)
  if (values.includes('FAILED')) return 'FAILED'
  if (values.every(s => s === 'COMPLETED')) return 'COMPLETED'
  if (values.includes('RUNNING')) return 'RUNNING'
  return 'PENDING'
}

export interface JobSummary {
  id: string
  filename?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export async function getAllJobsSummaries(): Promise<JobSummary[]> {
  const ids = await loadIndex()
  if (ids.length === 0) return []
  const jobs = await Promise.all(
    ids.map(async id => {
      const full = await loadJobStatus(id)
      if (!full) return null
      return {
        id: full.id,
        filename: full.filename,
        status: deriveStatus(full.steps),
        createdAt: full.createdAt,
        updatedAt: full.updatedAt
      } as JobSummary
    })
  )
  return jobs.filter(Boolean) as JobSummary[]
}