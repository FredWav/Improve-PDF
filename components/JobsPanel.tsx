"use client";

import { Job } from "@/types/job";
// LA CORRECTION EST ICI : on retire les accolades {} autour de ProgressSteps
import ProgressSteps from "./ProgressSteps";

// On définit le "contrat" (Props) que ce composant accepte.
interface JobsPanelProps {
  job: Job | null;
  error: string | null;
}

// Le composant accepte les props 'job' et 'error'.
export function JobsPanel({ job, error }: JobsPanelProps) {
  // Cas 1 : Il y a une erreur
  if (error) {
    return (
      <div className="p-4 mt-8 border border-red-300 rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-800">Impossible de traiter le fichier</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  // Cas 2 : Il n'y a pas encore de job à afficher
  if (!job) {
    return (
      <div className="p-4 mt-8 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Traitements récents</h3>
        <p className="mt-2 text-sm text-gray-600">Aucun job récent pour l'instant.</p>
      </div>
    );
  }

  // Cas 3 : On affiche le suivi du job en cours
  return (
    <div className="p-4 mt-8 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Suivi du traitement</h3>
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
          job.status === 'completed' ? 'bg-green-100 text-green-800' :
          job.status === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {job.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600 truncate" title={job.filename}>Fichier : {job.filename}</p>

      <div className="mt-4">
        <ProgressSteps steps={job.steps} />
      </div>
    </div>
  );
}
