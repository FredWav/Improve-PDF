"use client";

import { JobStep } from "@/types/job";

interface ProgressStepsProps {
  steps: JobStep[];
}

const StatusIcon = ({ status }: { status: JobStep['status'] }) => {
  switch (status) {
    case 'completed':
      return (
        <svg className="w-3.5 h-3.5 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5.917 5.724 10.5 15 1.5"/>
        </svg>
      );
    case 'running':
      return (
        <svg className="w-3.5 h-3.5 text-blue-500 animate-spin" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3V1m0 18v-2M5.05 5.05 3.636 3.636m12.728 12.728L14.95 14.95M3 10H1m18 0h-2M5.05 14.95l-1.414 1.414M16.364 3.636 14.95 5.05"/>
        </svg>
      );
    case 'failed':
      return <span className="text-red-500 font-bold">×</span>;
    default: // pending
      return <div className="w-3 h-3 bg-gray-300 rounded-full"></div>;
  }
};

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.name} className="flex items-center">
          <div 
            className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 ${
              step.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <StatusIcon status={step.status} />
          </div>
          <div className="flex-1">
            <p className={`font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
              {step.name}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
