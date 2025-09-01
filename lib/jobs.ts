import { sql } from '@vercel/postgres';
import { Job, JobStep, JobStatus, StepStatus } from '@/types/job';

// Crée un nouveau job dans la base de données Postgres
export async function createJob(id: string, filename: string, inputFileUrl: string): Promise<Job> {
  const initialSteps: JobStep[] = [
    { name: 'Téléchargement', status: 'completed' },
    { name: 'Extraction du texte', status: 'pending' },
    { name: 'Réécriture (IA)', status: 'pending' },
    { name: 'Génération des images', status: 'pending' },
    { name: 'Mise en page finale', status: 'pending' },
  ];

  const stepsJson = JSON.stringify(initialSteps);

  // Insère le nouveau job dans la table 'jobs'
  await sql`
    INSERT INTO jobs (id, filename, status, input_file_url, steps)
    VALUES (${id}, ${filename}, 'pending', ${inputFileUrl}, ${stepsJson}::jsonb);
  `;

  const job = await getJob(id);
  if (!job) {
    throw new Error('La création du job a échoué.');
  }
  return job;
}

// Récupère un job depuis la base de données par son ID
export async function getJob(id: string): Promise<Job | null> {
  const { rows } = await sql`
    SELECT id, filename, status, created_at, updated_at, input_file_url, output_file_url, steps
    FROM jobs
    WHERE id = ${id};
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    filename: row.filename,
    status: row.status as JobStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    inputFileUrl: row.input_file_url,
    outputFileUrl: row.output_file_url,
    steps: row.steps as JobStep[],
  };
}

// Met à jour le statut ou une étape d'un job
export async function updateJob(id: string, newStatus: JobStatus, stepToUpdate?: { name: string; status: StepStatus }) {
    const job = await getJob(id);
    if (!job) {
        throw new Error(`Job non trouvé: ${id}`);
    }

    let newSteps = job.steps;
    if (stepToUpdate) {
        newSteps = job.steps.map(step =>
            step.name === stepToUpdate.name ? { ...step, status: stepToUpdate.status } : step
        );
    }
    
    const stepsJson = JSON.stringify(newSteps);

    // Met à jour la ligne dans la base de données
    await sql`
        UPDATE jobs
        SET 
            status = ${newStatus}, 
            steps = ${stepsJson}::jsonb,
            updated_at = NOW()
        WHERE id = ${id};
    `;
}
