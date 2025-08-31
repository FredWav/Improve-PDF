'use client'
import { useEffect, useRef, useState } from 'react'
import { deriveJobInfo, type DerivedJobInfo } from '@/lib/ui/jobNarrative'

async function fetchJob(jobId: string) {
  // 1) cheme “jobs” (nouvel alias)
  let res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
  if (res.status === 404) {
    // 2) fallback vers le handler d’origine
    res = await fetch(`/api/status/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
  }
  if (!res.ok) {
    let msg = `Status ${res.status}`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export function useJob(jobId: string, { interval = 2000 }: { interval?: number } = {}) {
  const [data, setData] = useState<any>(null)
  const [derived, setDerived] = useState<DerivedJobInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const json = await fetchJob(jobId)
        if (cancelled) return

        setData(json)
        try {
          const d = deriveJobInfo(json)
          setDerived(d)
          setDone(d.failed || d.percent >= 100 || json?.completed === true)
        } catch {
          // Pas bloquant si derive plante
        }
        setError(null)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur inconnue')
      } finally {
        if (!cancelled) {
          timer.current = window.setTimeout(tick, interval)
        }
      }
    }

    tick()
    return () => {
      cancelled = true
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [jobId, interval])

  return { data, derived, error, done }
}
