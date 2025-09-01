import type { JobStatus, StepStatus, JobStep, Job } from '@/types/job';

export interface DerivedJobInfo {
  totalSteps: number;
  completedSteps: number;
  progress: number;
  narrative: string;
  isProcessing: boolean;
  isTerminal: boolean;
  canRetry: boolean;
  failed: boolean; // On ajoute la propriété manquante
}

const defaultInfo: DerivedJobInfo = {
  totalSteps: 0,
  completedSteps: 0,
  progress: 0,
  narrative: 'En attente d\'informations...',
  isProcessing: false,
  isTerminal: false,
  canRetry: false,
  failed: false, // Valeur par défaut
};

export function deriveJobInfo(job: Job | null): DerivedJobInfo {
  if (!job) {
    return defaultInfo;
  }

  const totalSteps = job.steps.length;
  const completedSteps = job.steps.filter(s => s.status === 'completed').length;
  
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const isProcessing = job.status === 'pending' || job.status === 'running';
  const isTerminal = job.status === 'completed' || job.status === 'failed';
  const canRetry = job.status === 'failed';
  const failed = job.status === 'failed'; // On calcule la nouvelle propriété

  let narrative = 'Le traitement est en attente de démarrage.';
  if (job.status === 'running') {
    const currentStep = job.steps.find(s => s.status === 'running');
    narrative = currentStep ? `Étape en cours : ${currentStep.name}...` : 'Démarrage du traitement...';
  } else if (job.status === 'completed') {
    narrative = 'Le traitement est terminé avec succès !';
  } else if (job.status === 'failed') {
    narrative = 'Le traitement a échoué.';
  }

  return {
    totalSteps,
    completedSteps,
    progress,
    narrative,
    isProcessing,
    isTerminal,
    canRetry,
    failed, // On retourne la nouvelle propriété
  };
}
