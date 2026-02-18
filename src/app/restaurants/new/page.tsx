'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureCurrentUserProfile } from '@/lib/profile'

export default function NewRestaurantPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()

    if (!user) {
      setError(profileError ?? 'Necesitas iniciar sesión.')
      setLoading(false)
      router.push('/auth/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name,
        city: city || null,
        address: address || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/restaurants/${data.id}`)
    router.refresh()
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo restaurante</h1>
      <p className="mt-1 text-sm text-slate-600">Añade un templo foodie y empieza a puntuar sus platos más adictivos.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Ciudad
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Dirección
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Crear restaurante'}
        </button>
      </form>
    </section>
  )
}
