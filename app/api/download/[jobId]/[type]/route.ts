import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs'; // On utilise la nouvelle fonction centralisée

type DownloadRouteParams = {
  params: {
    jobId: string;
    type: string; // pdf, epub, etc.
  };
};

export async function GET(request: Request, { params }: DownloadRouteParams) {
  const { jobId, type } = params;

  try {
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job non trouvé.' }, { status: 404 });
    }

    // On vérifie si le job est terminé et s'il a bien une URL de sortie
    if (job.status !== 'completed' || !job.outputFileUrl) {
      return NextResponse.json({ error: 'Le fichier n\'est pas encore prêt ou le traitement a échoué.' }, { status: 400 });
    }

    // La solution la plus simple et la plus robuste est de rediriger 
    // l'utilisateur directement vers l'URL du fichier stocké sur Vercel Blob.
    return NextResponse.redirect(job.outputFileUrl);

  } catch (error) {
    console.error(`Erreur pour le téléchargement du job ${jobId}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
