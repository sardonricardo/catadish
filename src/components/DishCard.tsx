'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Droplets, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureCurrentUserProfile } from '@/lib/profile'
import ConfirmModal from '@/components/ConfirmModal'
import type { DishCategory } from '@/lib/database.types'

type DishReview = {
  id: string
  user_id: string | null
  rating: number
  comment: string | null
  created_at: string | null
  profiles: {
    username: string | null
  } | null
}

interface DishCardProps {
  dish: {
    id: string
    name: string
    description: string | null
    category: string | null
    price: number | null
    created_by: string | null
    avg_rating?: number | null
    review_count?: number
    reviews: DishReview[]
    photos: {
      id: string
      storage_path: string
      caption: string | null
      is_featured: boolean
      created_at: string
    }[]
  }
  initiallyExpanded?: boolean
}

const dishCategories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

export default function DishCard({ dish, initiallyExpanded = false }: DishCardProps) {
  const router = useRouter()
  const [isDeleted, setIsDeleted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded)
  const [isEditingDish, setIsEditingDish] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dishName, setDishName] = useState(dish.name)
  const [dishDescription, setDishDescription] = useState(dish.description ?? '')
  const [dishPrice, setDishPrice] = useState(dish.price != null ? String(dish.price) : '')
  const [dishCategory, setDishCategory] = useState<DishCategory | ''>((dish.category as DishCategory | null) ?? '')
  const [editingDishLoading, setEditingDishLoading] = useState(false)
  const [deletingDishLoading, setDeletingDishLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const ratingLabels = ['Muy flojo', 'Aceptable', 'Rico', 'Muy top', 'Orgásmico']

  const computedAverage = useMemo(() => {
    if (!dish.reviews.length) {
      return null
    }

    const sum = dish.reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / dish.reviews.length).toFixed(1)
  }, [dish.reviews])
  const average =
    dish.avg_rating != null
      ? Number(dish.avg_rating).toFixed(1)
      : computedAverage
  const reviewCount = dish.review_count ?? dish.reviews.length

  const orderedPhotos = useMemo(() => {
    return [...dish.photos].sort((a, b) => {
      if (a.is_featured === b.is_featured) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return a.is_featured ? -1 : 1
    })
  }, [dish.photos])

  const canManageDish = Boolean(currentUserId && dish.created_by && currentUserId === dish.created_by)

  useEffect(() => {
    const loadCurrentUserAndOwnReview = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      let userId = sessionData.session?.user?.id ?? null

      if (!userId) {
        const { data: userData } = await supabase.auth.getUser()
        userId = userData.user?.id ?? null
      }

      setCurrentUserId(userId)

      if (!userId) return

      const { data: ownReview, error: ownReviewError } = await supabase
        .from('reviews')
        .select('rating, comment')
        .eq('dish_id', dish.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (ownReviewError) return

      if (ownReview) {
        setRating(ownReview.rating)
        setComment(ownReview.comment ?? '')
      }
    }

    loadCurrentUserAndOwnReview()
  }, [dish.id])

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()

    if (!user) {
      setError(profileError ?? 'Debes iniciar sesión para reseñar.')
      setLoading(false)
      router.push('/auth/login')
      return
    }

    const { error: upsertError } = await supabase
      .from('reviews')
      .upsert(
        {
          dish_id: dish.id,
          user_id: user.id,
          rating,
          comment: comment || null,
        },
        { onConflict: 'dish_id,user_id' },
      )

    if (upsertError) {
      setError(upsertError.message)
      setLoading(false)
      return
    }

    setComment('')
    setLoading(false)
    router.refresh()
  }

  const handlePhotoUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!photoFile) {
      setError('Selecciona una foto antes de subir.')
      return
    }

    setUploadingPhoto(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()
    if (!user) {
      setError(profileError ?? 'Debes iniciar sesión para subir fotos.')
      setUploadingPhoto(false)
      router.push('/auth/login')
      return
    }

    const safeName = photoFile.name.replaceAll(/[^a-zA-Z0-9._-]/g, '-')
    const storagePath = `${user.id}/${dish.id}/${Date.now()}-${safeName}`

    const { error: storageError } = await supabase.storage.from('dish-pics').upload(storagePath, photoFile, {
      cacheControl: '3600',
      upsert: false,
    })

    if (storageError) {
      setError(storageError.message)
      setUploadingPhoto(false)
      return
    }

    const { error: dbError } = await supabase.from('dish_photos').insert({
      dish_id: dish.id,
      uploaded_by: user.id,
      storage_path: storagePath,
      caption: photoCaption || null,
    })

    if (dbError) {
      setError(dbError.message)
      setUploadingPhoto(false)
      return
    }

    setPhotoCaption('')
    setPhotoFile(null)
    setUploadingPhoto(false)
    router.refresh()
  }

  const handleUpdateDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setEditingDishLoading(true)

    const parsedPrice = dishPrice.trim() ? Number(dishPrice) : null
    const { data: updatedRows, error: updateError } = await supabase
      .from('dishes')
      .update({
        name: dishName,
        description: dishDescription || null,
        price: Number.isNaN(parsedPrice) ? null : parsedPrice,
        category: dishCategory || null,
      })
      .eq('id', dish.id)
      .select('id')

    if (updateError) {
      setError(updateError.message)
      setEditingDishLoading(false)
      return
    }

    if (!updatedRows || updatedRows.length === 0) {
      setError('No tienes permisos para editar este plato (RLS).')
      setEditingDishLoading(false)
      return
    }

    setEditingDishLoading(false)
    setIsEditingDish(false)
    router.refresh()
  }

  const handleDeleteDish = async () => {
    setError(null)
    setDeletingDishLoading(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()
    if (!user) {
      setError(profileError ?? 'Debes iniciar sesión para borrar platos.')
      setDeletingDishLoading(false)
      router.push('/auth/login')
      return
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dish.id)
      .eq('created_by', user.id)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
      setDeletingDishLoading(false)
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      setError('No tienes permisos para borrar este plato (RLS).')
      setDeletingDishLoading(false)
      return
    }

    setDeletingDishLoading(false)
    setShowDeleteModal(false)
    setIsDeleted(true)
    router.refresh()
  }

  if (isDeleted) {
    return null
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{dish.name}</h3>
          <p className="text-sm text-slate-600 line-clamp-2">{dish.description ?? 'Sin descripción'}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{dish.category ?? 'Sin categoría'}</p>
        </div>

        <div className="flex items-center gap-2 text-right">
          <p className="text-sm font-semibold text-slate-700">{dish.price != null ? `${dish.price}€` : 'Precio N/A'}</p>
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Droplets className="h-3.5 w-3.5 fill-current" />
            <span>{average ?? 'Sin notas'}</span>
            <span>({reviewCount})</span>
          </p>
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <span>{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
          </p>
        </div>
      </button>

      {isExpanded && <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
        {canManageDish && (
          <div className="flex flex-wrap items-center gap-2">
            {!isEditingDish && (
              <button
                type="button"
                onClick={() => setIsEditingDish(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                <Pencil className="h-4 w-4" />
                Editar plato
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Borrar plato
            </button>
          </div>
        )}

        {isEditingDish && (
          <form onSubmit={handleUpdateDish} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                required
                value={dishName}
                onChange={(event) => setDishName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Descripción
              <textarea
                rows={2}
                value={dishDescription}
                onChange={(event) => setDishDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dishPrice}
                  onChange={(event) => setDishPrice(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Categoría
                <select
                  value={dishCategory}
                  onChange={(event) => setDishCategory(event.target.value as DishCategory | '')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Sin categoría</option>
                  {dishCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={editingDishLoading}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {editingDishLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDishName(dish.name)
                  setDishDescription(dish.description ?? '')
                  setDishPrice(dish.price != null ? String(dish.price) : '')
                  setDishCategory((dish.category as DishCategory | null) ?? '')
                  setIsEditingDish(false)
                }}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">Reseñas con hambre</h4>
        {dish.reviews.length === 0 && <p className="text-sm text-slate-500">Todavía no hay reseñas.</p>}
        {dish.reviews.map((review) => (
          <div key={review.id} className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">
              {review.profiles?.username ?? 'Usuario'} · {review.rating}/5
            </p>
            {review.comment && <p className="mt-1 text-slate-600">{review.comment}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-700">Food shots del plato</h4>
        {orderedPhotos.length === 0 && <p className="text-sm text-slate-500">Todavía no hay fotos.</p>}
        {orderedPhotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {orderedPhotos.map((photo) => {
              const publicUrl = supabase.storage.from('dish-pics').getPublicUrl(photo.storage_path).data.publicUrl
              return (
                <figure key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img src={publicUrl} alt={photo.caption ?? dish.name} className="h-28 w-full object-cover" />
                  {photo.caption && <figcaption className="p-2 text-xs text-slate-600">{photo.caption}</figcaption>}
                </figure>
              )
            })}
          </div>
        )}
      </div>

      <form onSubmit={handlePhotoUpload} className="space-y-2 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-700">Subir food shot</h4>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600"
        />
        <label className="block text-sm font-medium text-slate-700">
          Caption
          <input
            type="text"
            value={photoCaption}
            onChange={(event) => setPhotoCaption(event.target.value)}
            placeholder="Opcional"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>
        <button
          type="submit"
          disabled={uploadingPhoto}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {uploadingPhoto ? 'Subiendo...' : 'Subir foto'}
        </button>
      </form>

      <form onSubmit={handleReviewSubmit} className="space-y-2 border-t border-slate-200 pt-4">
        <label className="block text-sm font-medium text-slate-700">
          Tu puntuación caliente
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= rating
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} de 5`}
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 transition hover:scale-110"
                  >
                    <Droplets
                      className={`h-6 w-6 ${active ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`}
                    />
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-600">{rating}/5 · {ratingLabels[rating - 1]}</p>
          </div>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Comentario
          <textarea
            rows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Opcional"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Guardar reseña'}
        </button>
      </form>
      </div>}

      <ConfirmModal
        open={showDeleteModal}
        title="Borrar plato"
        description="Se eliminarán también sus reseñas y fotos. Esta acción no se puede deshacer."
        confirmLabel="Sí, borrar plato"
        cancelLabel="Cancelar"
        loading={deletingDishLoading}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDish}
      />
    </article>
  )
}
