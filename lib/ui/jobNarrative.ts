import type { Job } from '@/types/job';

// Le "contrat" final, qui inclut toutes les propriétés que votre code semble utiliser
export interface DerivedJobInfo {
  // Propriétés de progression
  percent: number; // Renommé 'progress' en 'percent' pour correspondre à votre code
  totalSteps: number;
  completedSteps: number;
  
  // Statuts booléens pour simplifier la logique de l'interface
  isProcessing: boolean; // true si 'pending' ou 'running'
  isTerminal: boolean;   // true si 'completed' ou 'failed'
  canRetry: boolean;     // true si 'failed'
  failed: boolean;
  completed: boolean;    // Ajouté pour correspondre à votre code

  // Texte descriptif pour l'utilisateur
  narrative: string;
}

// Valeurs par défaut pour éviter les erreurs si le job n'est pas encore chargé
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
};

// La fonction qui transforme l'objet Job brut en informations utiles pour l'UI
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

  let narrative = 'Le traitement est en attente de démarrage.';
  if (job.status === 'running') {
    const currentStep = job.steps.find(s => s.status === 'running');
    narrative = currentStep ? `Étape en cours : ${currentStep.name}...` : 'Démarrage du traitement...';
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
  };
}
