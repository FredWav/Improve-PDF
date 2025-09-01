import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

type StatusRouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: StatusRouteParams) {
  const { id: jobId } = params; // renomme 'id' en 'jobId' pour plus de clarté

  if (!jobId) {
    return NextResponse.json({ error: 'ID du job manquant.' }, { status: 400 });
  }

  try {
    // Récupère le job depuis Postgres
    const job = await getJob(jobId);

    if (!job) {
      // Si le job n'existe pas dans la BDD, alors c'est un vrai 404
      return NextResponse.json({ error: 'Job non trouvé.' }, { status: 404 });
    }

    return NextResponse.json(job, { status: 200 });

  } catch (error) {
    console.error(`Erreur pour récupérer le statut du job ${jobId}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
