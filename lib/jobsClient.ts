export interface JobInfo {
  id: string
  filename?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export async function fetchJobs(): Promise<JobInfo[]> {
  const res = await fetch('/api/jobs/list', { cache: 'no-store' })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : (json.jobs || [])
}