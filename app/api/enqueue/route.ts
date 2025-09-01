import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createJob } from '@/lib/jobs';
import { nanoid } from 'nanoid';
import { inngest } from '../../../inngest/client'; // On importe le client Inngest

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

    // --- MODIFICATION IMPORTANTE ---
    // On envoie un événement à Inngest pour lui dire de commencer le travail.
    await inngest.send({
      name: 'app/job.created', // Le nom de l'événement que notre fonction écoute
      data: { jobId: job.id }, // On lui passe l'ID du job à traiter
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });

  } catch (error) {
    console.error('Erreur durant la mise en file dattente:', error);
    return NextResponse.json({ error: 'Échec du traitement du fichier.' }, { status: 500 });
  }
}
