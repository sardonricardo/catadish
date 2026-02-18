import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, created_by, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    project: url,
    error: error?.message ?? null,
    count: data?.length ?? 0,
    restaurants: data ?? [],
  })
}
