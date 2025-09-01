"use client";

import { Job } from "@/types/job";
import ProgressSteps from "./ProgressSteps"; // On importe le composant des étapes

interface JobsPanelProps {
  job: Job | null;
  error: string | null;
}

export function JobsPanel({ job, error }: JobsPanelProps) {
  // NOTE : Ceci est une version avec un style propre et standard.
  
  if (error) {
    return (
      <div className="p-4 mt-8 border border-red-300 rounded-lg bg-red-50 text-center">
        <h3 className="text-lg font-semibold text-red-800">Impossible de démarrer le traitement</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 mt-8 text-center">
        <h3 className="text-lg font-semibold text-gray-800">Traitements récents</h3>
        <p className="mt-2 text-sm text-gray-600">Aucun job récent pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="p-6 mt-8 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Suivi du traitement</h3>
          <p className="mt-1 text-sm text-gray-600 truncate" title={job.filename}>
            Fichier : {job.filename}
          </p>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
          job.status === 'completed' ? 'bg-green-100 text-green-800' :
          job.status === 'failed' ? 'bg-red-100 text-red-800' :
          job.status === 'pending' ? 'bg-gray-100 text-gray-800' :
          'bg-blue-100 text-blue-800 animate-pulse' // 'running'
        }`}>
          {job.status}
        </span>
      </div>

      <div className="mt-4">
        <ProgressSteps steps={job.steps} />
      </div>
    </div>
  );
}
