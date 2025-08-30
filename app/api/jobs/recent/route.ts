import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // On tente d'utiliser lib/jobIndex s'il existe.
    let jobs: any[] = []
    try {
      const mod: any = await import('@/lib/jobIndex')
      const fn =
        mod.getRecentJobs ||
        mod.listRecentJobs ||
        mod.listJobs ||
        mod.default
      if (typeof fn === 'function') {
        const res = await fn()
        jobs = Array.isArray(res) ? res : (res?.jobs ?? [])
      }
    } catch {
      // Si lib/jobIndex n'existe pas encore, on renvoie simplement une liste vide
      jobs = []
    }

    return NextResponse.json({ jobs }, { status: 200 })
  } catch {
    // Toujours renvoyer un 200 avec liste vide pour éviter le spam d’erreurs côté client
    return NextResponse.json({ jobs: [] }, { status: 200 })
  }
}
