import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createJob } from '@/lib/jobs';
import { nanoid } from 'nanoid';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
  }

  try {
    // --- LA CORRECTION EST ICI ---
    // On ajoute l'option 'addRandomSuffix: true' pour s'assurer que chaque
    // nom de fichier est unique et éviter les conflits.
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    const jobId = nanoid();
    // On utilise le nouveau nom de fichier unique (blob.pathname) renvoyé par Vercel Blob
    const job = await createJob(jobId, blob.pathname, blob.url);

    await inngest.send({
      name: 'app/job.created',
      data: { jobId: job.id },
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });

  } catch (error) {
    console.error('Erreur durant le téléversement:', error);
    // On peut renvoyer un message d'erreur plus précis si on le souhaite
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    return NextResponse.json({ error: `Échec du traitement du fichier: ${errorMessage}` }, { status: 500 });
  }
}
