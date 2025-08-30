
export const metadata = { title: "Improve PDF", description: "Make PDFs better" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{fontFamily:'Inter, system-ui, sans-serif', margin:0, padding:20, background:'#f6f7fb', color:'#0f172a'}}>
        <div style={{maxWidth:900, margin:'0 auto'}}>{children}</div>
      </body>
    </html>
  )
}
