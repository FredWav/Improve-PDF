import './globals.css'

export const metadata = {
  title: 'Improve PDF',
  description: 'Améliore, réécris et exporte des PDF proprement.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 antialiased font-sans">
        {/* Fond subtil : radial + grille */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(transparent,transparent_31px,#eaeef6_32px)] bg-[size:100%_32px]" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight text-slate-800">Ebook Improver</span>
            <nav className="hidden sm:flex items-center gap-4 text-xs text-slate-600">
              <a className="hover:text-slate-900" href="/docs">Docs</a>
              <a className="hover:text-slate-900" href="mailto:">Support</a>
            </nav>
          </div>
        </header>

        {/* Contenu */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 text-[11px] text-slate-500">
            © Improve PDF — Tous droits réservés
          </div>
        </footer>
      </body>
    </html>
  )
}
