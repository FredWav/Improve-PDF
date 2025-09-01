import type { Job, JobStep } from '@/types/job';

// Le "contrat" final, qui inclut TOUTES les propriétés
export interface DerivedJobInfo {
  percent: number;
  totalSteps: number;
  completedSteps: number;
  isProcessing: boolean;
  isTerminal: boolean;
  canRetry: boolean;
  failed: boolean;
  completed: boolean;
  narrative: string;
  activeStepKey: string | null; // La dernière propriété manquante
}

const defaultInfo: DerivedJobInfo = {
  totalSteps: 0,
  completedSteps: 0,
  percent: 0,
  narrative: 'En attente d\'informations...',
  isProcessing: false,
  isTerminal: false,
  canRetry: false,
  failed: false,
  completed: false,
  activeStepKey: null,
};

export function deriveJobInfo(job: Job | null): DerivedJobInfo {
  if (!job) {
    return defaultInfo;
  }

  const totalSteps = job.steps.length;
  const completedSteps = job.steps.filter(s => s.status === 'completed').length;
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const isProcessing = job.status === 'pending' || job.status === 'running';
  const isTerminal = job.status === 'completed' || job.status === 'failed';
  const failed = job.status === 'failed';
  const completed = job.status === 'completed';
  const canRetry = failed;

  // On calcule la dernière propriété
  const currentStep = job.steps.find(s => s.status === 'running');
  const activeStepKey = currentStep ? currentStep.name : null;

  let narrative = 'Le traitement est en attente de démarrage.';
  if (job.status === 'running') {
    narrative = activeStepKey ? `Étape en cours : ${activeStepKey}...` : 'Démarrage du traitement...';
  } else if (completed) {
    narrative = 'Le traitement est terminé avec succès !';
  } else if (failed) {
    narrative = 'Le traitement a échoué.';
  }

  return {
    totalSteps,
    completedSteps,
    percent,
    narrative,
    isProcessing,
    isTerminal,
    canRetry,
    failed,
    completed,
    activeStepKey, // On retourne la nouvelle propriété
  };
}
