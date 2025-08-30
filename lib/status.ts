// === AJOUT NON-BREAKING POUR L'UI DES JOBS ===

// Statut global normalisé, commun à la liste (RecentJob) et au détail (JobStatus)
export type OverallStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

// Type léger utilisé côté liste/récents
export type RecentJob = {
  id: string
  status: OverallStatus
  filename?: string
  createdAt?: string | number
}

// Type guard : détecte si on a un JobStatus complet (celui déjà défini dans ce fichier)
function isFullJobStatus(x: any): x is JobStatus {
  return (
    x &&
    typeof x === 'object' &&
    x.steps &&
    typeof x.steps === 'object' &&
    Array.isArray(x.logs)
  )
}

// Déduit un statut global à partir des steps du JobStatus
export function getOverallStatusFromSteps(job: JobStatus): OverallStatus {
  const values = Object.values(job.steps)
  if (values.includes('FAILED')) return 'failed'
  if (values.every(s => s === 'COMPLETED')) return 'succeeded'
  if (values.includes('RUNNING')) return 'processing'
  // s’il reste au moins un PENDING et rien ne tourne, on considère "queued"
  return 'queued'
}

// Infos d’affichage pour un job (badges, libellés, sous-libellés)
export type JobInfo = {
  label: string
  sublabel?: string
  badgeColor: 'gray' | 'blue' | 'green' | 'red'
}

/**
 * Unifie l’info d’affichage, que l’on fournisse un RecentJob (liste)
 * ou un JobStatus (détail). NE MODIFIE AUCUNE FONCTION EXISTANTE.
 */
export function deriveJobInfo(job: RecentJob | JobStatus): JobInfo {
  const status: OverallStatus = isFullJobStatus(job)
    ? getOverallStatusFromSteps(job)
    : job.status

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

  // Attention : dans JobStatus, le nom de fichier est `filename` (et pas fileName)
  const baseName = (isFullJobStatus(job) ? job.filename : job.filename) || ''

  // Optionnel : on affiche le nombre d’étapes si on a un JobStatus en cours
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
