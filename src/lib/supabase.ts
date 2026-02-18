import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const isDev = process.env.NODE_ENV !== 'production'

if (!isSupabaseConfigured) {
  if (isDev) {
    console.warn('Missing Supabase env vars. Configure .env.local to enable API calls.')
  } else {
    throw new Error('Missing Supabase env vars in production: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://127.0.0.1:54321', // local fallback only for dev workflows
  supabaseAnonKey ?? 'local-dev-anon-key',
)
