'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'
import { buildGoogleMapsLink } from '@/lib/maps'

interface RestaurantHeaderProps {
  restaurant: {
    id: string
    name: string
    city: string | null
    address: string | null
    created_by: string | null
  }
}

export default function RestaurantHeader({ restaurant }: RestaurantHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [name, setName] = useState(restaurant.name)
  const [city, setCity] = useState(restaurant.city ?? '')
  const [address, setAddress] = useState(restaurant.address ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isEditing = searchParams.get('edit') === '1'

  useEffect(() => {
    const loadUser = async () => {
      const { user } = await ensureCurrentUserProfile()
      setCurrentUserId(user?.id ?? null)
    }

    loadUser()
  }, [])

  const setEditingInUrl = (editing: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (editing) {
      params.set('edit', '1')
    } else {
      params.delete('edit')
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const canEdit = useMemo(() => {
    return Boolean(currentUserId && restaurant.created_by && currentUserId === restaurant.created_by)
  }, [currentUserId, restaurant.created_by])
  const mapsLink = useMemo(
    () =>
      buildGoogleMapsLink({
        name,
        address,
        city,
      }),
    [name, address, city],
  )

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const { data: updatedRows, error: updateError } = await supabase
      .from('restaurants')
      .update({
        name,
        city: city || null,
        address: address || null,
        created_by: currentUserId,
      })
      .eq('id', restaurant.id)
      .select('id')

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    if (!updatedRows || updatedRows.length === 0) {
      setError('No tienes permisos para editar este templo (RLS).')
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    setEditingInUrl(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)

    const { data: deletedRows, error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurant.id)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      setError('No tienes permisos para borrar este templo (RLS).')
      setIsDeleting(false)
      return
    }

    router.push('/restaurants')
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <form onSubmit={handleSave} className="space-y-3">
        {isEditing ? (
          <>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-2xl font-bold text-slate-900"
            />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ciudad"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700"
            />
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Dirección exacta"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-600"
            />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
            <p className="mt-2 text-slate-600">{city || 'Ciudad pendiente'}</p>
            <p className="text-slate-500">{address || 'Dirección pendiente'}</p>
          </>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-cyan-300 px-3 py-1 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
              >
                Abrir en Google Maps
              </a>
            )}
            {isEditing ? (
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingInUrl(true)}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Editar
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setName(restaurant.name)
                  setCity(restaurant.city ?? '')
                  setAddress(restaurant.address ?? '')
                  setEditingInUrl(false)
                }}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="rounded-md border border-rose-300 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              {isDeleting ? 'Borrando...' : 'Eliminar'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      <ConfirmModal
        open={showDeleteModal}
        title="Eliminar templo"
        description="Se borrarán también sus platos, fotos y reseñas. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        loading={isDeleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await handleDelete()
          setShowDeleteModal(false)
        }}
      />
    </div>
  )
}
