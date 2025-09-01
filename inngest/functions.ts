import { inngest } from './client';
import { getJob, updateJob } from '../lib/jobs';
import pdf from 'pdf-parse';

export const processEbook = inngest.createFunction(
  { id: 'process-ebook-job' },
  { event: 'app/job.created' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    await step.run('update-status-to-running', async () => {
      await updateJob(jobId, 'running');
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
      return data.text;
    });

    const rewrittenText = await step.run('rewrite-text-with-gemini', async () => {
      console.log(`Réécriture pour le job ${jobId} avec le texte de ${textContent.length} caractères.`);
      return `(Texte réécrit) ${textContent.substring(0, 500)}...`;
    });

    await step.run('update-status-to-completed', async () => {
      await updateJob(jobId, 'completed');
    });

    return { success: true, finalContent: rewrittenText };
  }
);
