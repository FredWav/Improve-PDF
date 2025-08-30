'use client'

import { useJob } from '@/hooks/useJob'
import { JobVerboseStatus } from '@/components/JobVerboseStatus'
import { useParams } from 'next/navigation'

export default function JobPage() {
  const { id } = useParams() as { id: string }
  const { data, error, done, derived } = useJob(id, { interval: 1500 })

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">
          Statut du traitement
        </h1>
        <p className="text-sm text-slate-500">
          Suivi détaillé d’un document (interface verbeuse personnelle)
        </p>
      </header>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          Erreur de récupération du job: {error}
        </div>
      )}

      {!data && !error && (
        <div className="text-sm text-slate-500">Chargement…</div>
      )}

      {data && <JobVerboseStatus job={data} />}

      {done && derived && !derived.failed && (
        <div className="p-4 border rounded-md bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
          Traitement entièrement terminé. Tu peux télécharger les sorties ou revenir à l’accueil.
        </div>
      )}

      {derived?.failed && (
        <div className="p-4 border rounded-md bg-red-50 border-red-200 text-red-700 text-sm">
          Le job est en échec. Consulte les logs, corrige la cause puis relance.
        </div>
      )}
    </main>
  )
}