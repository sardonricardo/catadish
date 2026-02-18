import Link from 'next/link'

export default function LandingPage() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-16 shadow-sm sm:px-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-cyan-200/45 blur-3xl" />

      <div className="relative mx-auto max-w-3xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Guarda los platos que te ponen a mil
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
            Tu rincón foodie para puntuar, compartir y repetir solo lo que merece volver a provocar antojo.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Crear cuenta
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  )
}
