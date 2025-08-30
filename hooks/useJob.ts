'use client'
import { useEffect, useRef, useState } from 'react'
import { deriveJobInfo, type DerivedJobInfo } from '@/lib/ui/jobNarrative'

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
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          const d = deriveJobInfo(json)
            setDerived(d)
          setError(null)
          const allFinished = d.completedSteps === d.totalSteps || d.failed
          if (allFinished) {
            setDone(true)
            return
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error')
      }
      if (!cancelled) {
        timer.current = window.setTimeout(tick, interval)
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