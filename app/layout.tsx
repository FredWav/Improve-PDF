export const metadata = { title: "Improve-PDF", description: "Ebook enrichi" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fr"><body style={{fontFamily:"system-ui"}}>{children}</body></html>);
}
