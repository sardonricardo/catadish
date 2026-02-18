import type { Metadata } from 'next'
import Link from 'next/link'
import AuthNav from '@/components/AuthNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catadish',
  description: 'Placer gastronómico en cada bocado. Guarda, comparte y puntúa platos que encienden.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
                Catadish
              </Link>
              <AuthNav />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
