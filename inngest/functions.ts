import { inngest } from './client';
import { getJob, updateJob } from '../lib/jobs';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialise le client Google AI avec la clé API stockée sur Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

export const processEbook = inngest.createFunction(
  { id: 'process-ebook-job', timeout: '10m' }, // Augmente le temps maximum à 10 minutes
  { event: 'app/job.created' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    await step.run('update-job-to-running', async () => {
      await updateJob(jobId, 'running', { name: 'Extraction du texte', status: 'running' });
    });

    const job = await step.run('fetch-job-details', async () => {
      const jobDetails = await getJob(jobId);
      if (!jobDetails || !jobDetails.inputFileUrl) {
        throw new Error('Job ou URL du fichier introuvable.');
      }
      return jobDetails;
    });

    const textContent = await step.run('extract-text-from-pdf', async () => {
      const response = await fetch(job.inputFileUrl!);
      const buffer = await response.arrayBuffer();
      const data = await pdf(buffer);
      await updateJob(jobId, 'running', { name: 'Extraction du texte', status: 'completed' });
      return data.text;
    });

    await step.run('update-rewrite-step-status', async () => {
        await updateJob(jobId, 'running', { name: 'Réécriture (IA)', status: 'running' });
    });

    const rewrittenText = await step.run('rewrite-text-with-gemini', async () => {
      // Vérifie si le texte est assez long pour être traité
      if (!textContent || textContent.length < 50) {
        return "(Contenu trop court pour être réécrit)";
      }
      
      const prompt = `Reformule le texte suivant de manière professionnelle et engageante, sans en altérer le sens original. Améliore la clarté et la fluidité. Voici le texte : "${textContent}"`;
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error("Erreur de l'API Gemini:", error);
        // En cas d'erreur de l'API, on renvoie le texte original pour ne pas bloquer le processus
        return `(Erreur de réécriture) ${textContent}`;
      }
    });

    await step.run('update-job-to-completed', async () => {
        await updateJob(jobId, 'completed', { name: 'Réécriture (IA)', status: 'completed' });
    });

    return { success: true, finalContent: rewrittenText };
  }
);
