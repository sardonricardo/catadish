'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { DishCategory } from '@/lib/database.types'
import { ensureCurrentUserProfile } from '@/lib/profile'

interface AddDishFormProps {
  restaurantId: string
}

const categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

export default function AddDishForm({ restaurantId }: AddDishFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<DishCategory | ''>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { user, error: profileError } = await ensureCurrentUserProfile()

    if (!user) {
      setError(profileError ?? 'Necesitas iniciar sesión para añadir platos.')
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

    if (photoFile && createdDish?.id) {
      const safeName = photoFile.name.replaceAll(/[^a-zA-Z0-9._-]/g, '-')
      const storagePath = `${user.id}/${createdDish.id}/${Date.now()}-${safeName}`

      const { error: storageError } = await supabase.storage.from('dish-pics').upload(storagePath, photoFile, {
        cacheControl: '3600',
        upsert: false,
      })

      if (storageError) {
        setError(`Plato creado, pero la foto falló: ${storageError.message}`)
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
        setError(`Plato creado, pero no se guardó la metadata de foto: ${photoInsertError.message}`)
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
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Añadir plato irresistible</h2>

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
        Descripción
        <textarea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
        />
      </label>

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
          Caption de foto (opcional)
          <input
            type="text"
            value={photoCaption}
            onChange={(event) => setPhotoCaption(event.target.value)}
            placeholder="Ej: brutal y super jugoso"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar plato'}
      </button>
    </form>
  )
}
