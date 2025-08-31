'use client'
import { useEffect, useRef, useState } from 'react'
import { deriveJobInfo, type DerivedJobInfo } from '@/lib/ui/jobNarrative'

async function fetchJob(jobId: string) {
  // 1) Try new "jobs" endpoint first
  let res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
  if (res.status === 404) {
    // 2) Fallback to original status endpoint  
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

async function retryExtract(jobId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/jobs/retry-extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: jobId }),
      cache: 'no-store'
    })

    const result = await res.json().catch(() => ({}))
    
    if (res.ok) {
      return { 
        success: true, 
        message: result.message || 'Extract retry triggered successfully' 
      }
    } else {
      return { 
        success: false, 
        message: result.error || `Retry failed: ${res.status}` 
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Network error: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
}

export function useJob(jobId: string, { interval = 2000 }: { interval?: number } = {}) {
  const [data, setData] = useState<any>(null)
  const [derived, setDerived] = useState<DerivedJobInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [retryAttempted, setRetryAttempted] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const json = await fetchJob(jobId)
        if (cancelled) return

        setData(json)
        setError(null)

        try {
          const d = deriveJobInfo(json)
          setDerived(d)
          setDone(d.failed || d.percent >= 100 || json?.completed === true)

          // Auto-retry logic for stuck jobs
          if (!retryAttempted && json?.steps?.extract === 'PENDING' && 
              Date.now() - new Date(json.createdAt).getTime() > 10000) { // 10 seconds old
            
            console.log(`Job ${jobId} appears stuck, attempting extract retry...`)
            setRetryAttempted(true)
            
            const retryResult = await retryExtract(jobId)
            if (retryResult.success) {
              console.log(`Retry successful for job ${jobId}: ${retryResult.message}`)
            } else {
              console.warn(`Retry failed for job ${jobId}: ${retryResult.message}`)
            }
          }
        } catch (deriveError) {
          console.warn('Failed to derive job info:', deriveError)
        }

      } catch (e: any) {
        if (!cancelled) {
          const errorMessage = e?.message || 'Unknown error'
          setError(errorMessage)
          
          // If it's a 404 and we haven't tried retry yet, try once more
          if (errorMessage.includes('404') && !retryAttempted) {
            console.log(`Job ${jobId} not found, will attempt retry next tick...`)
            // Don't set retryAttempted yet, let it try on next tick
          }
        }
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
  }, [jobId, interval, retryAttempted])

  // Manual retry function that can be called from UI
  const manualRetry = async () => {
    console.log(`Manual retry requested for job ${jobId}`)
    const result = await retryExtract(jobId)
    setRetryAttempted(true)
    return result
  }

  return { 
    data, 
    derived, 
    error, 
    done, 
    retryAttempted,
    manualRetry 
  }
}
