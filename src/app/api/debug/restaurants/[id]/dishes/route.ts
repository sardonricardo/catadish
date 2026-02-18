import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RouteProps {
  params: {
    id: string
  }
}

export async function GET(_: Request, { params }: RouteProps) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('dishes')
    .select('id, restaurant_id, name, created_by, created_at')
    .eq('restaurant_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    project: url,
    restaurantId: params.id,
    error: error?.message ?? null,
    count: data?.length ?? 0,
    dishes: data ?? [],
  })
}
