'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { DishCategory } from '@/lib/database.types'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { getSensualRatingLabel } from '@/lib/rating'

interface AddDishFormProps {
  restaurantId: string
}

const categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

function getHeatColor(step: number) {
  const t = (step - 1) / 4
  const start = { r: 56, g: 189, b: 248 } // sky-400
  const end = { r: 244, g: 63, b: 94 } // rose-500
  const r = Math.round(start.r + (end.r - start.r) * t)
  const g = Math.round(start.g + (end.g - start.g) * t)
  const b = Math.round(start.b + (end.b - start.b) * t)
  return `rgb(${r} ${g} ${b})`
}

export default function AddDishForm({ restaurantId }: AddDishFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<DishCategory | ''>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [initialFlavorRating, setInitialFlavorRating] = useState<number>(0)
  const [initialTextureRating, setInitialTextureRating] = useState<number>(0)
  const [initialPresentationRating, setInitialPresentationRating] = useState<number>(0)
  const [initialValueRating, setInitialValueRating] = useState<number>(0)
  const [initialComment, setInitialComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialRatings = [initialFlavorRating, initialTextureRating, initialPresentationRating, initialValueRating]
  const hasAnyInitialRating = initialRatings.some((value) => value > 0)
  const hasAllInitialRatings = initialRatings.every((value) => value >= 1 && value <= 5)
  const initialAverage = hasAllInitialRatings
    ? Number((initialRatings.reduce((sum, value) => sum + value, 0) / initialRatings.length).toFixed(1))
    : null

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()

    if (!user) {
      setError(profileError ?? 'Necesitas iniciar sesión para crear platos.')
      setLoading(false)
      return
    }

    const parsedPrice = price.trim() ? Number(price) : null

    const { data: createdDish, error: insertError } = await supabase
      .from('dishes')
      .insert({
        restaurant_id: restaurantId,
        created_by: user.id,
        name,
        description: description || null,
        price: Number.isNaN(parsedPrice) ? null : parsedPrice,
        category: category || null,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (hasAnyInitialRating && !hasAllInitialRatings) {
      setError('Si quieres guardar una nota inicial, completa las 4 categorías.')
      setLoading(false)
      return
    }

    if (hasAllInitialRatings && createdDish?.id) {
      const reviewPayload = {
        dish_id: createdDish.id,
        user_id: user.id,
        rating: initialAverage ?? 0,
        flavor_rating: initialFlavorRating,
        texture_rating: initialTextureRating,
        presentation_rating: initialPresentationRating,
        value_rating: initialValueRating,
        comment: initialComment || null,
      }

      const { error: reviewInsertError } = await supabase.from('reviews').insert(reviewPayload)

      if (reviewInsertError) {
        setError(`Plato creado, pero no se pudo guardar la nota inicial: ${reviewInsertError.message}`)
        setLoading(false)
        router.refresh()
        return
      }
    }

    if (photoFile && createdDish?.id) {
      const safeName = photoFile.name.replaceAll(/[^a-zA-Z0-9._-]/g, '-')
      const storagePath = `${user.id}/${createdDish.id}/${Date.now()}-${safeName}`

      const { error: storageError } = await supabase.storage.from('dish-pics').upload(storagePath, photoFile, {
        cacheControl: '3600',
        upsert: false,
      })

      if (storageError) {
        setError(`Plato creado, pero falló la subida de foto: ${storageError.message}`)
        setLoading(false)
        router.refresh()
        return
      }

      const { error: photoInsertError } = await supabase.from('dish_photos').insert({
        dish_id: createdDish.id,
        uploaded_by: user.id,
        storage_path: storagePath,
        caption: photoCaption || null,
      })

      if (photoInsertError) {
        setError(`Plato creado, pero no se guardó el registro de la foto: ${photoInsertError.message}`)
        setLoading(false)
        router.refresh()
        return
      }
    }

    setName('')
    setDescription('')
    setPrice('')
    setCategory('')
    setPhotoFile(null)
    setPhotoCaption('')
    setInitialFlavorRating(0)
    setInitialTextureRating(0)
    setInitialPresentationRating(0)
    setInitialValueRating(0)
    setInitialComment('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Añadir plato tentación</h2>

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

      <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Descripción del plato (opcional)</summary>
        <label className="mt-2 block text-sm font-medium text-slate-700">
          Descripción
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Solo si te aporta contexto"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Precio
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Categoría
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as DishCategory | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          >
            <option value="">Sin categoría</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Foto del plato (opcional)
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slate-600"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Texto de foto (opcional)
          <input
            type="text"
            value={photoCaption}
            onChange={(event) => setPhotoCaption(event.target.value)}
            placeholder="Ej: cremosa, potente, pecado total"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-700">Primera chispa (opcional)</p>
        <div className="mt-2 space-y-2">
          {[
            { label: 'Sabor', value: initialFlavorRating, setter: setInitialFlavorRating },
            { label: 'Textura', value: initialTextureRating, setter: setInitialTextureRating },
            { label: 'Presentación', value: initialPresentationRating, setter: setInitialPresentationRating },
            { label: 'Calidad/precio', value: initialValueRating, setter: setInitialValueRating },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= item.value
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${item.label} ${value} de 5`}
                        onClick={() => item.setter(value)}
                        className="rounded-md p-1 transition hover:scale-110"
                      >
                        <Flame
                          className={`h-5 w-5 fill-current ${active ? 'drop-shadow-[0_2px_6px_rgba(239,68,68,0.35)]' : 'text-slate-300'}`}
                          style={active ? { color: getHeatColor(value) } : undefined}
                        />
                      </button>
                    )
                  })}
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {item.value > 0 ? `${item.value}/5 · ${getSensualRatingLabel(item.value)}` : 'Sin nota'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          {initialAverage != null
            ? `${initialAverage}/5 · ${getSensualRatingLabel(initialAverage)}`
            : 'Nota final'}
        </p>
        <details className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Confesión extra (opcional)</summary>
          <label className="mt-2 block text-sm font-medium text-slate-700">
            Comentario picante
            <textarea
              rows={2}
              value={initialComment}
              onChange={(event) => setInitialComment(event.target.value)}
              placeholder="Ej: punto exacto, puro vicio"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
            />
          </label>
        </details>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Crear plato'}
      </button>
    </form>
  )
}
