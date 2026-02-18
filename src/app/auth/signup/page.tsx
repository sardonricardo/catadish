'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (!user) {
      setNotice('Cuenta creada. Revisa tu correo para confirmar el acceso.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      username,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setNotice('Cuenta creada correctamente.')
    const nextPath = searchParams.get('next')
    router.push(nextPath || '/')
    router.refresh()
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-600">Empieza a guardar platos que te vuelan la cabeza bocado a bocado.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Usuario
          <input
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

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
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/auth/login" className="font-semibold text-slate-900 underline">
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}
