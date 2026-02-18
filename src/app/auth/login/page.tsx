'use client'

import { Suspense } from 'react'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const nextPath = searchParams.get('next')
    router.push(nextPath || '/')
    router.refresh()
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-600">Vuelve a tu archivo de platos brutales y reseñas con hambre real.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/signup" className="font-semibold text-slate-900 underline">
          Regístrate
        </Link>
      </p>
    </section>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">Cargando...</section>}>
      <LoginPageContent />
    </Suspense>
  )
}
