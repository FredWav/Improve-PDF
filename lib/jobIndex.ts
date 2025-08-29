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
    // allowOverwrite so repeated writes to index work
    await uploadJSON(ids, { key: INDEX_PATH, addTimestamp: false, allowOverwrite: true })
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

export interface ListJobsParams {
  page?: number
  pageSize?: number
  sort?: 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface ListJobsResult {
  jobs: JobSummary[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export async function listJobs({ page = 1, pageSize = 50, sort = 'updatedAt', order = 'desc' }: ListJobsParams = {}): Promise<ListJobsResult> {
  if (page < 1) page = 1
  if (pageSize < 1) pageSize = 1
  const all = await getAllJobsSummaries()

  const factor = order === 'asc' ? 1 : -1
  const sorted = [...all].sort((a, b) => {
    const av = (a[sort] || '')
    const bv = (b[sort] || '')
    if (av === bv) return 0
    return av < bv ? -1 * factor : 1 * factor
  })

  const total = sorted.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const slice = sorted.slice(start, end)

  return {
    jobs: slice,
    total,
    page,
    pageSize,
    hasMore: end < total
  }
}