import type { JobStatus, StepStatus } from '@/lib/status'

export interface DerivedJobInfo {
  totalSteps: number
  completedSteps: number
  failed: boolean
  activeStepKey?: string
  activeStepStatus?: string
  percent: number
  shortLabel: string
  narrative: string
  lastLogLine?: string
  awaitingWork: boolean
}

/** Ordre déterministe des étapes, typé en littéraux */
const ORDER = ['extract', 'normalize', 'rewrite', 'images', 'render'] as const
type StepKey = typeof ORDER[number]

const STEP_LABELS: Record<StepKey, string> = {
  extract: 'Extraction du texte',
  normalize: 'Normalisation / nettoyage',
  rewrite: 'Réécriture assistée IA',
  images: 'Génération / insertion d’images',
  render: 'Rendu final (HTML / Markdown / PDF / EPUB)'
}

const STEP_RUNNING_PHRASES: Record<StepKey, string> = {
  extract: 'Je lis le PDF et j’en extrais le texte brut…',
  normalize: 'Je nettoie et structure le texte extrait…',
  rewrite: 'Je reformule et améliore le contenu…',
  images: 'Je prépare ou génère les images nécessaires…',
  render: 'J’assemble tout et produis les sorties finales…'
}

const STEP_PENDING_PHRASES: Record<StepKey, string> = {
  extract: 'Prêt à commencer l’extraction du texte.',
  normalize: 'En attente: normalisation après extraction.',
  rewrite: 'En attente: réécriture après normalisation.',
  images: 'En attente: génération d’images après réécriture.',
  render: 'En attente: rendu final après toutes les étapes.'
}

const STEP_COMPLETED_PHRASES: Record<StepKey, string> = {
  extract: 'Extraction terminée.',
  normalize: 'Texte normalisé.',
  rewrite: 'Réécriture terminée.',
  images: 'Images traitées.',
  render: 'Rendu terminé.'
}

const STEP_FAILED_PHRASES: Record<StepKey, string> = {
  extract: 'Échec pendant l’extraction.',
  normalize: 'Échec pendant la normalisation.',
  rewrite: 'Échec pendant la réécriture.',
  images: 'Échec pendant le traitement des images.',
  render: 'Échec pendant le rendu final.'
}

function pickActiveStep(steps: JobStatus['steps']): StepKey | undefined {
  // Vue typée pour indexer sans erreur TS
  const stepsMap = steps as Record<StepKey, StepStatus>

  for (const k of ORDER) {
    if (stepsMap[k] === 'RUNNING') return k
  }
  for (const k of ORDER) {
    if (stepsMap[k] === 'PENDING') return k
  }
  return undefined
}

export function deriveJobInfo(job: JobStatus): DerivedJobInfo {
  const keys = Object.keys(job.steps) as StepKey[]
  const totalSteps = keys.length

  let completed = 0
  let failed = false
  for (const k of keys) {
    const st = job.steps[k]
    if (st === 'COMPLETED') completed++
    if (st === 'FAILED') failed = true
  }

  const active = pickActiveStep(job.steps) // StepKey | undefined
  const activeStatus: StepStatus | undefined = active ? job.steps[active] : undefined
  const percent = Math.round((completed / totalSteps) * 100)

  // Dernier log informatif (non-error)
  const lastLog = job.logs.slice().reverse().find(l => l.level !== 'error')

  let narrativeCore = ''
  if (failed) {
    narrativeCore = 'Le processus a rencontré une erreur.'
  } else if (active) {
    switch (activeStatus) {
      case 'RUNNING':
        narrativeCore = STEP_RUNNING_PHRASES[active] || 'Étape en cours…'
        break
      case 'PENDING':
        narrativeCore = STEP_PENDING_PHRASES[active] || 'En attente…'
        break
      case 'COMPLETED':
        narrativeCore = STEP_COMPLETED_PHRASES[active] || 'Étape terminée.'
        break
      case 'FAILED':
        narrativeCore = STEP_FAILED_PHRASES[active] || 'Échec.'
        break
      default:
        narrativeCore = 'Progression en cours…'
    }
  } else {
    // Toutes terminées ?
    if (completed === totalSteps && !failed) {
      narrativeCore = 'Traitement intégral terminé avec succès.'
    } else {
      narrativeCore = 'Initialisation…'
    }
  }

  const shortLabel =
    failed ? 'Échec'
    : completed === totalSteps ? 'Terminé'
    : active ? (STEP_LABELS[active] || active)
    : 'En cours'

  const narrative = [
    narrativeCore,
    !failed && completed === totalSteps ? 'Tous les livrables devraient être disponibles.' : '',
    lastLog ? `Dernier événement: ${lastLog.message}` : ''
  ].filter(Boolean).join(' ')

  const awaitingWork = activeStatus === 'PENDING' && completed === 0

  return {
    totalSteps,
    completedSteps: completed,
    failed,
    activeStepKey: active,
    activeStepStatus: activeStatus,
    percent,
    shortLabel,
    narrative,
    lastLogLine: lastLog?.message,
    awaitingWork
  }
}
