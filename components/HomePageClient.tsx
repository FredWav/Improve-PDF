"use client";

import { useState, useEffect, useCallback } from 'react';
import { UploadZone } from './UploadZone';
import { JobsPanel } from './JobsPanel';
import { Job } from '@/types/job'; // Assurez-vous que le chemin vers votre type Job est correct

export function HomePageClient() {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fonction pour gérer l'envoi du fichier
  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setJob(null);

    // 1. On prépare le fichier pour l'envoi
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 2. On envoie le fichier à l'API
      //    LA CORRECTION EST ICI : on ne met PAS de "headers" manuellement.
      //    Le navigateur s'en occupe pour nous, c'est ce qui résout votre erreur.
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Si le serveur renvoie une erreur (ex: 500)
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de démarrer le traitement.');
      }

      const { jobId } = await response.json();
      
      // 3. On récupère immédiatement le statut du nouveau job
      const initialJobStatus = await fetch(`/api/status/${jobId}`);
      if(initialJobStatus.ok) {
        const jobData = await initialJobStatus.json();
        setJob(jobData);
      } else {
         throw new Error('Le job a été créé, mais impossible de récupérer son statut.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
      console.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. On vérifie le statut du job toutes les 2 secondes s'il est en cours
  useEffect(() => {
    if (job?.status === 'running' || job?.status === 'pending') {
      const intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/status/${job.id}`);
          if (response.ok) {
            const updatedJob = await response.json();
            setJob(updatedJob);
            // Si le job est terminé ou a échoué, on arrête de vérifier
            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Erreur lors de la récupération du statut du job:', err);
          setError('Impossible de mettre à jour le statut du job.');
          clearInterval(intervalId);
        }
      }, 2000);

      // Nettoyage de l'intervalle si le composant est démonté
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
