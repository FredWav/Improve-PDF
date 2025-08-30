export const metadata = {
  title: 'Improve PDF',
  description: 'Améliore, réécris et exporte des PDF proprement.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased bg-slate-50">
        {/* fond subtile : radial + grille très légère */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.07),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(transparent,transparent_31px,#eaeef6_32px)] bg-[size:100%_32px]" />
        </div>

        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center">
            <span className="text-sm font-semibold tracking-tight text-slate-800">
              Ebook Improver
            </span>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  )
}
