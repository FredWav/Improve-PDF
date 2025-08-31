// Nouvelle approche: pas d'index centralisé, on liste directement via Vercel Blob API
import { list } from '@vercel/blob'
import { loadJobStatus } from './status'

const JOBS_PREFIX = 'jobs/'

export interface JobSummary {
  id: string
  filename?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

function extractJobIdFromPath(path: string): string | null {
  // Paths look like: "jobs/job-1234567890-abc123/manifest.json"
  const match = path.match(/^jobs\/(job-[^\/]+)\/manifest\.json$/)
  return match ? match[1] : null
}

function deriveStatus(steps: Record<string, string>): string {
  const values = Object.values(steps)
  if (values.includes('FAILED')) return 'FAILED'
  if (values.every(s => s === 'COMPLETED')) return 'COMPLETED'
  if (values.includes('RUNNING')) return 'RUNNING'
  return 'PENDING'
}

export async function getAllJobsSummaries(): Promise<JobSummary[]> {
  try {
    console.log('Listing jobs directly from Vercel Blob...')
    
    // List all blobs in the jobs/ prefix
    const { blobs } = await list({
      prefix: JOBS_PREFIX,
      token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_ONLY_TOKEN
    })

    console.log(`Found ${blobs.length} blobs in jobs/ prefix`)

    // Filter to only manifest.json files and extract job IDs
    const jobIds = blobs
      .map(blob => extractJobIdFromPath(blob.pathname))
      .filter((id): id is string => id !== null)

    console.log(`Extracted ${jobIds.length} job IDs: ${jobIds.join(', ')}`)

    if (jobIds.length === 0) return []

    // Load job details for each ID
    const jobs = await Promise.allSettled(
      jobIds.map(async id => {
        try {
          const full = await loadJobStatus(id)
          if (!full) {
            console.warn(`Job ${id} manifest exists but couldn't load status`)
            return null
          }
          return {
            id: full.id,
            filename: full.filename,
            status: deriveStatus(full.steps),
            createdAt: full.createdAt,
            updatedAt: full.updatedAt
          } as JobSummary
        } catch (error) {
          console.warn(`Failed to load job ${id}:`, error instanceof Error ? error.message : String(error))
          return null
        }
      })
    )

    const results = jobs
      .filter((result): result is PromiseFulfilledResult<JobSummary | null> => 
        result.status === 'fulfilled')
      .map(result => result.value)
      .filter((job): job is JobSummary => job !== null)

    console.log(`Successfully loaded ${results.length} jobs from ${jobIds.length} total`)
    return results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  } catch (error) {
    console.error('Failed to get jobs summaries:', error)
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

// Fonction vide pour compatibilité - plus besoin d'ajouter à un index
export async function appendJobId(id: string): Promise<void> {
  console.log(`Job ${id} created - no index to update (using direct blob listing)`)
  // Intentionnellement vide - on n'a plus besoin d'index centralisé
}
