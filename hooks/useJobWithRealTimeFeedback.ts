'use client'
import { useEffect, useRef, useState } from 'react'
import { deriveJobInfo, type DerivedJobInfo } from '@/lib/ui/jobNarrative'

interface RealTimeFeedback {
  step: string
  message: string
  timestamp: string
}

export function useJobWithRealTimeFeedback(jobId: string, { interval = 1500 }: { interval?: number } = {}) {
  const [data, setData] = useState<any>(null)
  const [derived, setDerived] = useState<DerivedJobInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [retryAttempted, setRetryAttempted] = useState(false)
  const [feedback, setFeedback] = useState<RealTimeFeedback[]>([])
  const timer = useRef<number | null>(null)

  const addFeedback = (step: string, message: string) => {
    const newFeedback: RealTimeFeedback = {
      step,
      message,
      timestamp: new Date().toISOString()
    }
    setFeedback(prev => [...prev, newFeedback])
  }

  async function fetchJob(jobId: string) {
    try {
      addFeedback('fetch', 'Récupération du statut du job...')
      
      // 1) Try new "jobs" endpoint first
      let res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
      if (res.status === 404) {
        addFeedback('fetch', 'Endpoint principal indisponible, tentative de fallback...')
        // 2) Fallback to original status endpoint  
        res = await fetch(`/api/status/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
      }
      
      if (!res.ok) {
        let msg = `Status ${res.status}`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
          if (j?.step) addFeedback('error', `Erreur à l'étape: ${j.step}`)
        } catch {}
        throw new Error(msg)
      }
      
      addFeedback('fetch', 'Statut récupéré avec succès')
      return res.json()
    } catch (error) {
      addFeedback('error', `Échec de récupération: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async function retryExtract(jobId: string): Promise<{ success: boolean; message?: string }> {
    try {
      addFeedback('retry', 'Tentative de relance de l\'extraction...')
      
      const res = await fetch('/api/jobs/retry-extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: jobId }),
        cache: 'no-store'
      })

      const result = await res.json().catch(() => ({}))
      
      if (res.ok) {
        addFeedback('retry', result.message || 'Relance déclenchée avec succès')
        return { 
          success: true, 
          message: result.message || 'Extract retry triggered successfully' 
        }
      } else {
        addFeedback('retry', `Échec de relance: ${result.error || res.status}`)
        return { 
          success: false, 
          message: result.error || `Retry failed: ${res.status}` 
        }
      }
    } catch (error) {
      const msg = `Erreur réseau: ${error instanceof Error ? error.message : String(error)}`
      addFeedback('retry', msg)
      return { success: false, message: msg }
    }
  }

  useEffect(() => {
    let cancelled = false
    addFeedback('init', `Démarrage du suivi pour le job ${jobId}`)

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

          // Real-time feedback based on job state
          if (d.activeStepKey) {
            addFeedback('progress', `Étape active: ${d.activeStepKey} (${d.percent}%)`)
          }

          // Auto-retry logic for stuck jobs
          if (!retryAttempted && json?.steps?.extract === 'PENDING' && 
              Date.now() - new Date(json.createdAt).getTime() > 10000) { // 10 seconds old
            
            addFeedback('auto-retry', `Job semble bloqué après 10s, tentative automatique de relance...`)
            setRetryAttempted(true)
            
            const retryResult = await retryExtract(jobId)
            if (retryResult.success) {
              addFeedback('auto-retry', `Relance automatique réussie: ${retryResult.message}`)
            } else {
              addFeedback('auto-retry', `Relance automatique échouée: ${retryResult.message}`)
            }
          }

        } catch (deriveError) {
          addFeedback('warning', 'Impossible d\'analyser le statut du job')
          console.warn('Failed to derive job info:', deriveError)
        }

      } catch (e: any) {
        if (!cancelled) {
          const errorMessage = e?.message || 'Unknown error'
          setError(errorMessage)
          
          // If it's a 404 and we haven't tried retry yet, prepare for next attempt
          if (errorMessage.includes('404') && !retryAttempted) {
            addFeedback('warning', `Job non trouvé (404), nouvelle tentative dans ${interval}ms...`)
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

  // Manual retry function
  const manualRetry = async () => {
    addFeedback('manual-retry', `Relance manuelle demandée pour le job ${jobId}`)
    const result = await retryExtract(jobId)
    setRetryAttempted(true)
    return result
  }

  // Clear feedback
  const clearFeedback = () => {
    setFeedback([])
  }

  return { 
    data, 
    derived, 
    error, 
    done, 
    retryAttempted,
    manualRetry,
    feedback,
    clearFeedback
  }
}
