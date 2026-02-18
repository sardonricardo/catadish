import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('Missing Supabase env vars. Configure .env.local to enable API calls.')
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'missing-key',
)
