"use client";

import { useState, useEffect, useCallback } from 'react';
import { UploadZone } from './UploadZone';
import { JobsPanel } from './JobsPanel';
import { Job } from '@/types/job';

export function HomePageClient() {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchJobStatusWithRetry = async (jobId: string, retries = 3, delay = 500) => {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(`/api/status/${jobId}`);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 404) {
        await new Promise(res => setTimeout(res, delay * (i + 1)));
      } else {
        throw new Error(`Erreur serveur inattendue: ${response.status}`);
      }
    }
    throw new Error("Le job a été créé, mais impossible de récupérer son statut après plusieurs tentatives.");
  };

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setJob(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de démarrer le traitement.');
      }

      const { jobId } = await response.json();
      const jobData = await fetchJobStatusWithRetry(jobId);
      setJob(jobData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      console.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (job?.status === 'running' || job?.status === 'pending') {
      const intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/status/${job.id}`);
          if (response.ok) {
            const updatedJob = await response.json();
            setJob(updatedJob);
            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              clearInterval(intervalId);
            }
          } else {
            setError('Impossible de récupérer le statut du job.');
            clearInterval(intervalId);
          }
        } catch (err) {
          setError('Impossible de mettre à jour le statut du job.');
          clearInterval(intervalId);
        }
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [job]);

  return (
    <div className="space-y-8">
      <UploadZone onFileSelect={handleUpload} isLoading={isLoading} />
      <JobsPanel job={job} error={error} />
    </div>
  );
}
