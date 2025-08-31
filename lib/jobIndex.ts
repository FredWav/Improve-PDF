import { uploadJSON, getJSON, uploadText } from './blob'
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

// Enhanced concurrency control with longer delays and overwrite support
export async function appendJobId(id: string, maxRetries = 8) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ids = await loadIndex()
      if (ids.includes(id)) {
        console.log(`Job ${id} already in index`)
        return // Already exists, no need to add
      }
      
      ids.push(id)
      console.log(`Attempting to save job index with ${ids.length} jobs (attempt ${attempt + 1}/${maxRetries + 1})`)
      
      await uploadJSON(ids, {
        key: INDEX_PATH,
        addTimestamp: false,
        allowOverwrite: true  // CRITICAL: Allow overwrite to handle concurrency
      })
      
      console.log(`Successfully added job ${id} to index`)
      return
    } catch (e: any) {
      console.warn(`Job index update attempt ${attempt + 1} failed for ${id}:`, e?.message || String(e))
      
      if (attempt === maxRetries) {
        console.error('Failed to append job id after all retries', id, e)
        throw e
      }
      
      // Progressive backoff: 100ms, 200ms, 400ms, 600ms, 800ms, 1000ms, 1200ms, 1500ms
      const delay = Math.min(100 * (attempt + 1) + Math.random() * 100, 1500)
      console.log(`Retrying job index update in ${delay}ms...`)
      await new Promise(res => setTimeout(res, delay))
    }
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
  try {
    const ids = await loadIndex()
    if (ids.length === 0) return []
    
    console.log(`Loading ${ids.length} jobs for summary`)
    
    const jobs = await Promise.allSettled(
      ids.map(async id => {
        try {
          const full = await loadJobStatus(id)
          if (!full) return null
          return {
            id: full.id,
            filename: full.filename,
            status: deriveStatus(full.steps),
            createdAt: full.createdAt,
            updatedAt: full.updatedAt
          } as JobSummary
        } catch (error) {
          console.warn(`Failed to load job ${id} for summary:`, error)
          return null
        }
      })
    )
    
    const results = jobs
      .filter((result): result is PromiseFulfilledResult<JobSummary | null> => 
        result.status === 'fulfilled')
      .map(result => result.value)
      .filter((job): job is JobSummary => job !== null)
    
    console.log(`Successfully loaded ${results.length} jobs from ${ids.length} total`)
    return results
  } catch (error) {
    console.error('Failed to get all jobs summaries:', error)
    return []
  }
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

export async function listJobs({
  page = 1,
  pageSize = 50,
  sort = 'updatedAt',
  order = 'desc'
}: ListJobsParams = {}): Promise<ListJobsResult> {
  if (page < 1) page = 1
  if (pageSize < 1) pageSize = 1
  if (pageSize > 200) pageSize = 200

  try {
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
    const slice = sorted.slice(start, start + pageSize)

    return {
      jobs: slice,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total
    }
  } catch (error) {
    console.error('Failed to list jobs:', error)
    return {
      jobs: [],
      total: 0,
      page,
      pageSize,
      hasMore: false
    }
  }
}
