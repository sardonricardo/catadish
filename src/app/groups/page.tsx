'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

type GroupListItem = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function GroupsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [groups, setGroups] = useState<GroupListItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGroups = async () => {
    const { user, error: userError } = await ensureCurrentUserProfile()

    if (!user) {
      router.push('/auth/login')
      setError(userError ?? 'Necesitas iniciar sesión.')
      setLoadingGroups(false)
      return
    }

    const { data, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, description, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (groupsError) {
      setError(groupsError.message)
      setLoadingGroups(false)
      return
    }

    setGroups((data as GroupListItem[] | null) ?? [])
    setLoadingGroups(false)
  }

  useEffect(() => {
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { user, error: userError } = await ensureCurrentUserProfile()
    if (!user) {
      setError(userError ?? 'Necesitas iniciar sesión.')
      setSubmitting(false)
      router.push('/auth/login')
      return
    }

    const { data, error: createError } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (createError) {
      setError(createError.message)
      setSubmitting(false)
      return
    }

    setName('')
    setDescription('')
    setSubmitting(false)
    router.push(`/groups/${data.id}`)
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grupos</h1>
        <p className="mt-2 text-slate-600">Crea un grupo y comparte tus restaurantes con amigos.</p>
      </div>

      <form onSubmit={handleCreateGroup} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Crear grupo</h2>

        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Descripción
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? 'Creando...' : 'Crear grupo'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Tus grupos</h2>
        {loadingGroups && <p className="text-sm text-slate-600">Cargando grupos...</p>}
        {!loadingGroups && groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            Aún no has creado grupos.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <h3 className="font-semibold text-slate-900">{group.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{group.description ?? 'Sin descripción'}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
