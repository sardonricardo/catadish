import { notFound } from 'next/navigation'
import AddDishForm from '@/components/AddDishForm'
import DishCard from '@/components/DishCard'
import RestaurantHeader from '@/components/RestaurantHeader'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface RestaurantPageProps {
  params: {
    id: string
  }
}

type RestaurantReview = {
  id: string
  dish_id: string
  user_id: string | null
  rating: number
  comment: string | null
  created_at: string | null
  profiles: {
    username: string | null
  } | null
}

type RestaurantDish = {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number | null
  created_by: string | null
  created_at: string | null
  avg_rating: number | null
  review_count: number
  reviews: RestaurantReview[] | null
  dish_photos:
    | {
        id: string
        storage_path: string
        caption: string | null
        is_featured: boolean
        created_at: string
      }[]
    | null
}

type RestaurantDetail = {
  id: string
  name: string
  city: string | null
  address: string | null
  created_by: string | null
  dishes: RestaurantDish[] | null
}

export default async function RestaurantDetailPage({ params }: RestaurantPageProps) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, city, address, created_by')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  const restaurant = data as unknown as RestaurantDetail
  const { data: dishesData } = await supabase
    .from('dishes')
    .select('id, name, description, category, price, created_by, created_at')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  const dishIds = (dishesData ?? []).map((dish) => dish.id)

  const { data: reviewsData } =
    dishIds.length > 0
      ? await supabase
          .from('reviews')
          .select('id, dish_id, user_id, rating, comment, created_at, profiles ( username )')
          .in('dish_id', dishIds)
      : { data: [] as RestaurantReview[] | null }

  const { data: photosData } =
    dishIds.length > 0
      ? await supabase
          .from('dish_photos')
          .select('id, dish_id, storage_path, caption, is_featured, created_at')
          .in('dish_id', dishIds)
      : { data: [] as RestaurantDish['dish_photos'] | null }

  const { data: dishRatingsData } =
    dishIds.length > 0
      ? await supabase
          .from('dishes_with_rating')
          .select('id, avg_rating, review_count')
          .in('id', dishIds)
      : { data: [] as { id: string; avg_rating: number | null; review_count: number }[] | null }

  const reviewsByDish = new Map<string, RestaurantReview[]>()
  ;(reviewsData ?? []).forEach((review) => {
    const list = reviewsByDish.get(review.dish_id) ?? []
    list.push(review as RestaurantReview)
    reviewsByDish.set(review.dish_id, list)
  })

  const photosByDish = new Map<string, NonNullable<RestaurantDish['dish_photos']>>()
  ;(photosData ?? []).forEach((photo) => {
    const list = photosByDish.get(photo.dish_id) ?? []
    list.push(photo)
    photosByDish.set(photo.dish_id, list)
  })

  const ratingsByDish = new Map<string, { avg_rating: number | null; review_count: number }>()
  ;(dishRatingsData ?? []).forEach((row) => {
    ratingsByDish.set(row.id, {
      avg_rating: row.avg_rating,
      review_count: row.review_count ?? 0,
    })
  })

  const dishes = (dishesData ?? []).map((dish) => ({
    ...dish,
    avg_rating: ratingsByDish.get(dish.id)?.avg_rating ?? null,
    review_count: ratingsByDish.get(dish.id)?.review_count ?? 0,
    reviews: reviewsByDish.get(dish.id) ?? [],
    dish_photos: photosByDish.get(dish.id) ?? [],
  }))

  const sortedDishes = [...dishes].sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0
    const right = b.created_at ? new Date(b.created_at).getTime() : 0
    return right - left
  })

  return (
    <section className="space-y-6">
      <RestaurantHeader
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          city: restaurant.city,
          address: restaurant.address,
          created_by: restaurant.created_by,
        }}
      />

      <AddDishForm restaurantId={restaurant.id} />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platos</h2>
        {sortedDishes.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            No hay platos todavía.
          </div>
        )}
        {sortedDishes.map((dish, index) => (
          <DishCard
            key={dish.id}
            initiallyExpanded={index === 0}
            dish={{
              id: dish.id,
              name: dish.name,
              description: dish.description,
              category: dish.category,
              price: dish.price,
              created_by: dish.created_by,
              avg_rating: dish.avg_rating,
              review_count: dish.review_count,
              reviews: dish.reviews ?? [],
              photos: dish.dish_photos ?? [],
            }}
          />
        ))}
      </div>
    </section>
  )
}
