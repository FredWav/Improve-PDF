"use client";

import React from 'react';
// LA CORRECTION EST ICI : On importe les types depuis le nouveau fichier centralisé '@/types/job'
import type { Job, JobStatus, StepStatus } from '@/types/job';

// Un petit helper pour associer les statuts à des couleurs
const statusClasses: Record<JobStatus | StepStatus, string> = {
  pending: "text-gray-500 bg-gray-100",
  running: "text-blue-700 bg-blue-100 animate-pulse",
  completed: "text-green-700 bg-green-100",
  failed: "text-red-700 bg-red-100",
};

interface JobVerboseStatusProps {
  job: Job | null;
}

export function JobVerboseStatus({ job }: JobVerboseStatusProps) {
  // Ne rien afficher si aucun job n'est actif
  if (!job) {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h3 className="text-md font-semibold text-gray-800">Statut détaillé</h3>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClasses[job.status]}`}>
          {job.status}
        </span>
      </div>
      <ul className="space-y-2">
        {job.steps.map((step) => (
          <li key={step.name} className="flex items-center text-sm">
            <span className={`w-24 text-center mr-3 font-medium px-2 py-0.5 rounded-full text-xs ${statusClasses[step.status]}`}>
              {step.status}
            </span>
            <span className="text-gray-700">{step.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
