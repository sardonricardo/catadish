'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

type RestaurantLite = {
  id: string
  name: string
  city: string | null
  address: string | null
  created_at: string | null
  avg_rating: number | null
  review_count: number
}

export default function HomePage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<RestaurantLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRestaurants = async () => {
      const { user, error: userError } = await ensureCurrentUserProfile()

      if (!user) {
        setError(userError ?? 'Necesitas iniciar sesión.')
        setLoading(false)
        router.push('/auth/login')
        return
      }

      const { data, error: queryError } = await supabase
        .from('restaurants')
        .select('id, name, city, address, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      const baseRestaurants = ((data as Omit<RestaurantLite, 'avg_rating' | 'review_count'>[] | null) ?? []).map(
        (restaurant) => ({
          ...restaurant,
          avg_rating: null,
          review_count: 0,
        }),
      )

      if (baseRestaurants.length === 0) {
        setRestaurants(baseRestaurants)
        setLoading(false)
        return
      }

      const restaurantIds = baseRestaurants.map((restaurant) => restaurant.id)
      const { data: dishesData, error: dishesError } = await supabase
        .from('dishes')
        .select('id, restaurant_id')
        .in('restaurant_id', restaurantIds)

      if (dishesError) {
        setError(dishesError.message)
        setLoading(false)
        return
      }

      const dishes = dishesData ?? []
      if (dishes.length === 0) {
        setRestaurants(baseRestaurants)
        setLoading(false)
        return
      }

      const dishIds = dishes.map((dish) => dish.id)
      const dishToRestaurant = new Map<string, string>()
      dishes.forEach((dish) => {
        if (!dish.restaurant_id) return
        dishToRestaurant.set(dish.id, dish.restaurant_id)
      })

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('dish_id, rating')
        .in('dish_id', dishIds)

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

      const totalsByRestaurant = new Map<string, { total: number; count: number }>()
      ;(reviewsData ?? []).forEach((review) => {
        if (!review.dish_id) return
        const restaurantId = dishToRestaurant.get(review.dish_id)
        if (!restaurantId) return

        const current = totalsByRestaurant.get(restaurantId) ?? { total: 0, count: 0 }
        current.total += review.rating
        current.count += 1
        totalsByRestaurant.set(restaurantId, current)
      })

      const withRatings = baseRestaurants.map((restaurant) => {
        const totals = totalsByRestaurant.get(restaurant.id)
        if (!totals || totals.count === 0) {
          return restaurant
        }

        return {
          ...restaurant,
          avg_rating: Number((totals.total / totals.count).toFixed(1)),
          review_count: totals.count,
        }
      })

      setRestaurants(withRatings)
      setLoading(false)
    }

    loadRestaurants()
  }, [router])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis restaurantes</h1>
          <p className="mt-2 text-slate-600">Tu mapa personal del placer foodie: platos que merecen repetirse.</p>
        </div>
        <Link
          href="/restaurants/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Añadir restaurante
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-600">Cargando restaurantes...</p>}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Error cargando restaurantes: {error}
        </p>
      )}

      {!loading && !error && restaurants.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Todavía no has creado restaurantes.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {restaurants.map((restaurant) => (
          <Link
            href={`/restaurants/${restaurant.id}`}
            key={restaurant.id}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{restaurant.name}</h2>
              <span className="inline-flex flex-col items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-tight text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                {restaurant.review_count > 0 ? (
                  <span>
                    {restaurant.avg_rating} ({restaurant.review_count})
                  </span>
                ) : (
                  <span>Sin notas</span>
                )}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{restaurant.city ?? 'Sin ciudad'}</p>
            <p className="text-sm text-slate-500">{restaurant.address ?? 'Dirección no especificada'}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
