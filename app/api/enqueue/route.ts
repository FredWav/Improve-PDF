import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createJob } from '@/lib/jobs';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
  }

  try {
    // 1. Uploader le fichier sur Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // 2. Créer un ID unique pour le job
    const jobId = nanoid();

    // 3. Créer le job dans la base de données Postgres
    const job = await createJob(jobId, file.name, blob.url);

    // TODO: Ici, il faudra déclencher le worker qui fera le vrai travail
    
    // 4. Renvoyer l'ID du job au client
    return NextResponse.json({ jobId: job.id }, { status: 201 });

  } catch (error) {
    console.error('Erreur durant la mise en file dattente:', error);
    return NextResponse.json({ error: 'Échec du traitement du fichier.' }, { status: 500 });
  }
}
