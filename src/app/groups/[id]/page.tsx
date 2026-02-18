'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Shield, Trash2, Users } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

type GroupRole = 'owner' | 'admin' | 'member'

type GroupInviteItem = {
  id: string
  email: string | null
  token: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  created_at: string
}

type GroupDetail = {
  id: string
  name: string
  description: string | null
  created_by: string
}

type GroupRestaurant = {
  id: string
  name: string
  city: string | null
  address: string | null
}

type MyRestaurantOption = {
  id: string
  name: string
  city: string | null
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const groupId = params.id

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<GroupRole | null>(null)
  const [invites, setInvites] = useState<GroupInviteItem[]>([])
  const [groupRestaurants, setGroupRestaurants] = useState<GroupRestaurant[]>([])
  const [myRestaurants, setMyRestaurants] = useState<MyRestaurantOption[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [linkingRestaurant, setLinkingRestaurant] = useState(false)
  const [creatingRestaurant, setCreatingRestaurant] = useState(false)
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [newRestaurantCity, setNewRestaurantCity] = useState('')
  const [newRestaurantAddress, setNewRestaurantAddress] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [copiedMessageInviteId, setCopiedMessageInviteId] = useState<string | null>(null)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editingGroup = searchParams.get('edit') === '1'

  const loadData = async () => {
    const { user, error: userError } = await ensureCurrentUserProfile()

    if (!user) {
      setError(userError ?? 'Necesitas iniciar sesión.')
      setLoading(false)
      router.push('/auth/login')
      return
    }
    setCurrentUserId(user.id)
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, created_by')
      .eq('id', groupId)
      .single()

    if (groupError || !groupData) {
      setError(groupError?.message ?? 'No se encontró el círculo.')
      setLoading(false)
      return
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      setError(membershipError.message)
      setLoading(false)
      return
    }

    const { data: inviteData, error: inviteError } = await supabase
      .from('group_invites')
      .select('id, email, token, status, expires_at, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (inviteError) {
      setError(inviteError.message)
      setLoading(false)
      return
    }

    const { data: groupRestaurantLinks, error: groupRestaurantsError } = await supabase
      .from('group_restaurants')
      .select('restaurant_id')
      .eq('group_id', groupId)

    if (groupRestaurantsError) {
      setError(groupRestaurantsError.message)
      setLoading(false)
      return
    }

    const linkedRestaurantIds = (groupRestaurantLinks ?? []).map((item) => item.restaurant_id)

    const { data: groupedRestaurantsData, error: groupedRestaurantsLoadError } =
      linkedRestaurantIds.length > 0
        ? await supabase
            .from('restaurants')
            .select('id, name, city, address')
            .in('id', linkedRestaurantIds)
            .order('created_at', { ascending: false })
        : { data: [] as GroupRestaurant[] | null, error: null }

    if (groupedRestaurantsLoadError) {
      setError(groupedRestaurantsLoadError.message)
      setLoading(false)
      return
    }

    const { data: myRestaurantsData, error: myRestaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, city')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (myRestaurantsError) {
      setError(myRestaurantsError.message)
      setLoading(false)
      return
    }

    const resolvedGroup = groupData as GroupDetail
    const normalizedGroupRestaurants = (groupedRestaurantsData as GroupRestaurant[] | null) ?? []
    const linkedIdSet = new Set(normalizedGroupRestaurants.map((item) => item.id))
    const myRestaurantsFiltered = ((myRestaurantsData as MyRestaurantOption[] | null) ?? []).filter(
      (restaurant) => !linkedIdSet.has(restaurant.id),
    )

    setGroup(resolvedGroup)
    setGroupName(resolvedGroup.name)
    setGroupDescription(resolvedGroup.description ?? '')
    setCurrentRole((membershipData?.role as GroupRole | null) ?? null)
    setInvites((inviteData as GroupInviteItem[] | null) ?? [])
    setGroupRestaurants(normalizedGroupRestaurants)
    setMyRestaurants(myRestaurantsFiltered)
    setLoading(false)
  }

  useEffect(() => {
    if (!groupId) {
      return
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

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

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
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

    const { data: createdInvite, error: inviteError } = await supabase
      .from('group_invites')
      .insert({
        group_id: groupId,
        email: null,
        invited_by: user.id,
      })
      .select('id, email, token, status, expires_at, created_at')
      .single()

    if (inviteError) {
      setError(inviteError.message)
      setSubmitting(false)
      return
    }

    if (createdInvite?.token) {
      setLastInviteLink(getInviteLink(createdInvite.token))
    }

    setSubmitting(false)
    await loadData()
  }

  const isCreator = Boolean(group && currentUserId && group.created_by === currentUserId)
  const canEditGroup = isCreator || currentRole === 'owner' || currentRole === 'admin'
  const canDeleteGroup = isCreator || currentRole === 'owner'
  const canManageRestaurants = Boolean(currentRole || isCreator)

  const handleUpdateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!group) {
      return
    }

    setError(null)
    setSavingGroup(true)

    const { data: updatedRows, error: updateError } = await supabase
      .from('groups')
      .update({
        name: groupName,
        description: groupDescription || null,
      })
      .eq('id', group.id)
      .select('id')

    if (updateError) {
      setError(updateError.message)
      setSavingGroup(false)
      return
    }

    if (!updatedRows || updatedRows.length === 0) {
      setError('No tienes permisos para editar este círculo (RLS).')
      setSavingGroup(false)
      return
    }

    setSavingGroup(false)
    setEditingInUrl(false)
    await loadData()
  }

  const handleDeleteGroup = async () => {
    if (!group) {
      return
    }

    setError(null)
    setDeletingGroup(true)

    const { data: deletedRows, error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', group.id)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
      setDeletingGroup(false)
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      setError('No tienes permisos para borrar este círculo (RLS).')
      setDeletingGroup(false)
      return
    }

    router.push('/groups')
    router.refresh()
  }

  const getInviteLink = (token: string) => {
    if (typeof window === 'undefined') {
      return `/invite/${token}`
    }

    return `${window.location.origin}/invite/${token}`
  }

  const handleCopy = async (invite: GroupInviteItem) => {
    const link = getInviteLink(invite.token)
    await navigator.clipboard.writeText(link)
    setCopiedInviteId(invite.id)
    setTimeout(() => setCopiedInviteId(null), 2000)
  }

  const handleCopyMessage = async (invite: GroupInviteItem) => {
    const link = getInviteLink(invite.token)
    const text = `Te invito a mi círculo en Catadish. Únete desde aquí: ${link}`
    await navigator.clipboard.writeText(text)
    setCopiedMessageInviteId(invite.id)
    setTimeout(() => setCopiedMessageInviteId(null), 2000)
  }

  const handleLinkRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRestaurantId || !currentUserId) return

    setError(null)
    setLinkingRestaurant(true)

    const { error: linkError } = await supabase.from('group_restaurants').insert({
      group_id: groupId,
      restaurant_id: selectedRestaurantId,
      added_by: currentUserId,
    })

    if (linkError) {
      setError(linkError.message)
      setLinkingRestaurant(false)
      return
    }

    setSelectedRestaurantId('')
    setLinkingRestaurant(false)
    await loadData()
  }

  const handleCreateRestaurantInGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUserId) return

    setError(null)
    setCreatingRestaurant(true)

    const { data: createdRestaurant, error: createError } = await supabase
      .from('restaurants')
      .insert({
        name: newRestaurantName,
        city: newRestaurantCity || null,
        address: newRestaurantAddress || null,
        created_by: currentUserId,
      })
      .select('id')
      .single()

    if (createError || !createdRestaurant) {
      setError(createError?.message ?? 'No se pudo crear el restaurante.')
      setCreatingRestaurant(false)
      return
    }

    const { error: linkError } = await supabase.from('group_restaurants').insert({
      group_id: groupId,
      restaurant_id: createdRestaurant.id,
      added_by: currentUserId,
    })

    if (linkError) {
      setError(`Restaurante creado, pero no se pudo añadir al círculo: ${linkError.message}`)
      setCreatingRestaurant(false)
      await loadData()
      return
    }

    setNewRestaurantName('')
    setNewRestaurantCity('')
    setNewRestaurantAddress('')
    setCreatingRestaurant(false)
    await loadData()
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando círculo...</p>
  }

  const roleLabel =
    currentRole === 'owner' ? 'Owner' : currentRole === 'admin' ? 'Admin' : currentRole === 'member' ? 'Miembro' : ''

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/groups" className="text-sm font-semibold text-slate-700 underline">
            Volver a círculos
          </Link>
          <div className="flex items-center gap-2">
            {roleLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                <Shield className="h-3.5 w-3.5" />
                {roleLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              <Users className="h-3.5 w-3.5" />
              {invites.length} invites
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="w-full max-w-2xl">
          {editingGroup ? (
            <form onSubmit={handleUpdateGroup} className="space-y-3">
              <input
                required
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-2xl font-bold tracking-tight text-slate-900 shadow-sm"
              />
              <textarea
                rows={2}
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-600 shadow-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingGroup ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroupName(group?.name ?? '')
                    setGroupDescription(group?.description ?? '')
                    setEditingInUrl(false)
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group?.name ?? 'Círculo'}</h1>
              <p className="mt-2 text-slate-600">{group?.description ?? 'Sin descripción'}</p>
            </>
          )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {canEditGroup && !editingGroup && (
              <button
                type="button"
                onClick={() => setEditingInUrl(true)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            )}
            {canDeleteGroup && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={deletingGroup}
                className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingGroup ? 'Borrando...' : 'Eliminar'}
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleInvite} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Crear invite por link</h2>
        <p className="text-sm text-slate-600">
          Genera un link compartible al instante. Cualquiera con cuenta podrá entrar a tu círculo.
        </p>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !canEditGroup}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {!canEditGroup
            ? 'Solo admin/owner puede invitar'
            : submitting
              ? 'Creando...'
              : 'Generar link para compartir'}
        </button>

        {lastInviteLink && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-800">Link de invite creado</p>
            <a href={lastInviteLink} className="break-all text-emerald-700 underline">
              {lastInviteLink}
            </a>
          </div>
        )}
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleLinkRestaurant} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Añadir restaurante al círculo</h2>
          <p className="text-sm text-slate-600">Selecciona uno de tus restaurantes ya creados.</p>
          <select
            value={selectedRestaurantId}
            onChange={(event) => setSelectedRestaurantId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona restaurante</option>
            {myRestaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}{restaurant.city ? ` · ${restaurant.city}` : ''}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!canManageRestaurants || linkingRestaurant || !selectedRestaurantId}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {!canManageRestaurants ? 'Sin permisos de miembro' : linkingRestaurant ? 'Añadiendo...' : 'Añadir al círculo'}
          </button>
        </form>

        <form onSubmit={handleCreateRestaurantInGroup} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Crear restaurante en el círculo</h2>
          <p className="text-sm text-slate-600">Se creará en tu cuenta y se vinculará automáticamente al círculo.</p>
          <input
            required
            value={newRestaurantName}
            onChange={(event) => setNewRestaurantName(event.target.value)}
            placeholder="Nombre del restaurante"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newRestaurantCity}
            onChange={(event) => setNewRestaurantCity(event.target.value)}
            placeholder="Ciudad (opcional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newRestaurantAddress}
            onChange={(event) => setNewRestaurantAddress(event.target.value)}
            placeholder="Dirección (opcional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!canManageRestaurants || creatingRestaurant || !newRestaurantName.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {!canManageRestaurants ? 'Sin permisos de miembro' : creatingRestaurant ? 'Creando...' : 'Crear y añadir'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Restaurantes del círculo</h2>
        {groupRestaurants.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            Aún no hay restaurantes vinculados.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {groupRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <h3 className="font-semibold text-slate-900">{restaurant.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{restaurant.city ?? 'Ciudad pendiente'}</p>
              <p className="text-sm text-slate-500">{restaurant.address ?? 'Dirección pendiente'}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Invites</h2>
        {invites.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            Aún no hay invites.
          </div>
        )}
        <div className="space-y-2">
          {invites.map((invite) => (
            <div key={invite.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">{invite.email ?? 'Invite abierto por link'}</p>
              <p className="text-slate-600">Estado: {invite.status}</p>
              <p className="text-slate-500">
                Expira: {new Date(invite.expires_at).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
              </p>
              {invite.status === 'pending' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={getInviteLink(invite.token)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Ver link
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(invite)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  >
                    {copiedInviteId === invite.id ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(invite)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  >
                    {copiedMessageInviteId === invite.id ? 'Mensaje copiado' : 'Copiar mensaje'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Te comparto un link para unirte a mi círculo en Catadish: ${getInviteLink(invite.token)}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Compartir por WhatsApp
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        title="Eliminar círculo"
        description="Eliminarás el círculo, sus miembros e invites. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar círculo"
        cancelLabel="Cancelar"
        loading={deletingGroup}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await handleDeleteGroup()
          setShowDeleteModal(false)
        }}
      />
    </section>
  )
}
