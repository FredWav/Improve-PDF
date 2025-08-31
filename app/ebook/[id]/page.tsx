'use client'

import { useJob } from '@/hooks/useJob'
import { JobVerboseStatus } from '@/components/JobVerboseStatus'
import { useParams } from 'next/navigation'

export default function JobPage() {
  const { id } = useParams() as { id: string }
  const { data, error, done, derived, retryAttempted, manualRetry } = useJob(id, { interval: 1500 })

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">
          Statut du traitement
        </h1>
        <p className="text-sm text-slate-500">
          Suivi détaillé d'un document (interface verbeuse personnelle)
        </p>
      </header>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <strong>Erreur de récupération du job:</strong> {error}
              {error.includes('404') && (
                <p className="mt-1 text-xs">
                  Le job pourrait encore être en cours d'initialisation. 
                  Ça devrait se résoudre dans quelques secondes...
                </p>
              )}
            </div>
            {error.includes('404') && (
              <button
                onClick={() => window.location.reload()}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded border border-red-300"
              >
                🔄 Actualiser
              </button>
            )}
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"/>
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          Chargement du job...
        </div>
      )}

      {data && (
        <JobVerboseStatus 
          job={data} 
          retryAttempted={retryAttempted}
          onManualRetry={manualRetry}
        />
      )}

      {done && derived && !derived.failed && (
        <div className="p-4 border rounded-md bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-medium">Traitement entièrement terminé!</p>
              <p className="mt-1">Tu peux télécharger les sorties ou revenir à l'accueil.</p>
            </div>
          </div>
        </div>
      )}

      {derived?.failed && (
        <div className="p-4 border rounded-md bg-red-50 border-red-200 text-red-700 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">❌</span>
            <div>
              <p className="font-medium">Le job est en échec.</p>
              <p className="mt-1">Consulte les logs ci-dessus, corrige la cause puis utilise le bouton de relance si disponible.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
