import { useEffect, useRef, useState } from 'react'

/**
 * Type représentant un job récent.
 * Ajuste / enrichis selon la vraie structure retournée par ton backend.
 */
export interface RecentJob {
  id: string
  filename?: string
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt?: string
  updatedAt?: string
  // Exemple: progression ou étapes
  stepsTotal?: number
  stepsDone?: number
  errorMessage?: string
}

/**
 * Résultat retourné par le hook.
 */
interface UseRecentJobsResult {
  jobs: RecentJob[]
  error: string | null
  refresh: () => void
  loading: boolean
}

/**
 * Hook de récupération des jobs récents.
 * Mécanisme:
 * 1. Essaye d'utiliser un endpoint REST: /api/jobs/recent
 * 2. Rafraîchit toutes les 5 secondes (polling simple)
 * 3. (Optionnel) Peut à terme être remplacé par SSE / websockets
 */
export function useRecentJobs(pollIntervalMs: number = 5000): UseRecentJobsResult {
  const [jobs, setJobs] = useState<RecentJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const intervalRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  async function fetchJobs() {
    try {
      setError(null)
      const res = await fetch('/api/jobs/recent', {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()

      // Normalisation légère si nécessaire
      const normalized: RecentJob[] = Array.isArray(data) ? data.map((j: any) => ({
        id: String(j.id ?? j.jobId ?? ''),
        filename: j.filename ?? j.fileName ?? j.name,
        status: j.status,
        createdAt: j.createdAt || j.created_at,
        updatedAt: j.updatedAt || j.updated_at,
        stepsTotal: j.stepsTotal ?? j.totalSteps ?? j.total,
        stepsDone: j.stepsDone ?? j.completedSteps ?? j.done,
        errorMessage: j.errorMessage ?? j.error
      })) : []

      if (!isMountedRef.current) return
      setJobs(normalized.filter(j => j.id))
      setLoading(false)
    } catch (e: any) {
      if (!isMountedRef.current) return
      setLoading(false)
      setError(e?.message || 'Erreur inconnue')
    }
  }

  function refresh() {
    fetchJobs()
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchJobs()
    // Polling
    intervalRef.current = window.setInterval(fetchJobs, pollIntervalMs)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs])

  return { jobs, error, refresh, loading }
}
