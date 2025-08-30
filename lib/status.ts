// === AJOUTS SÛRS: exports explicites + helpers UI ===

// Statut global simplifié (pour l’UI liste)
export type OverallStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

// Entrée légère utilisée côté liste de jobs
export type RecentJob = {
  id: string
  status: OverallStatus
  filename?: string
  createdAt?: string | number
}

// Type guard : détecte si on a un JobStatus complet (défini plus haut)
function isFullJobStatus(x: any): x is JobStatus {
  return x && typeof x === 'object' && x.steps && typeof x.steps === 'object' && Array.isArray(x.logs)
}

// Déduit un statut global à partir des steps d’un JobStatus
export function getOverallStatusFromSteps(job: JobStatus): OverallStatus {
  const values = Object.values(job.steps)
  if (values.includes('FAILED')) return 'failed'
  if (values.every(s => s === 'COMPLETED')) return 'succeeded'
  if (values.includes('RUNNING')) return 'processing'
  return 'queued' // il reste du PENDING, rien ne tourne
}

// Infos d’affichage unifiées (badge, labels)
export type JobInfo = {
  label: string
  sublabel?: string
  badgeColor: 'gray' | 'blue' | 'green' | 'red'
}

/** Unifie l’info d’affichage qu’on passe un RecentJob (liste) ou un JobStatus (détail). */
export function deriveJobInfo(job: RecentJob | JobStatus): JobInfo {
  const status: OverallStatus = isFullJobStatus(job) ? getOverallStatusFromSteps(job) : job.status

  const badgeColor: JobInfo['badgeColor'] =
    status === 'queued' ? 'gray'
    : status === 'processing' ? 'blue'
    : status === 'succeeded' ? 'green'
    : 'red'

  const label =
    status === 'queued' ? 'En file d’attente'
    : status === 'processing' ? 'En traitement'
    : status === 'succeeded' ? 'Terminé'
    : 'Échec'

  const baseName = (isFullJobStatus(job) ? job.filename : job.filename) || ''
  let sublabel = baseName

  if (isFullJobStatus(job)) {
    const stepCount = Object.keys(job.steps || {}).length
    const running = Object.values(job.steps || {}).includes('RUNNING')
    if ((status === 'processing' || status === 'queued') && stepCount) {
      const extra = running ? `${stepCount} étape(s) • en cours` : `${stepCount} étape(s)`
      sublabel = sublabel ? `${sublabel} • ${extra}` : extra
    }
  }

  return { label, sublabel: sublabel || undefined, badgeColor }
}
