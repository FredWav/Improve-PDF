import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createJob } from '../../lib/jobs'; // chemin mis à jour
import { nanoid } from 'nanoid';
import { inngest } from '../../inngest/client'; // On importe le client Inngest

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
  }

  try {
    const blob = await put(file.name, file, { access: 'public' });
    const jobId = nanoid();
    const job = await createJob(jobId, file.name, blob.url);

    // On envoie un événement à Inngest pour lui dire de commencer le travail.
    await inngest.send({
      name: 'app/job.created', 
      data: { jobId: job.id },
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });

  } catch (error) {
    console.error('Erreur durant le téléversement:', error);
    return NextResponse.json({ error: 'Échec du traitement du fichier.' }, { status: 500 });
  }
}
