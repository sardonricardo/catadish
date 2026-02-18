import { supabase } from '@/lib/supabase'

export async function ensureCurrentUserProfile() {
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { user: null, error: authError?.message ?? 'No authenticated user' }
  }

  const user = authData.user
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfileError) {
    return { user: null, error: existingProfileError.message }
  }

  if (existingProfile) {
    return { user, error: null }
  }

  // Keep username null to avoid unique collisions while unblocking FK-dependent writes.
  const fallbackUsername = null

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? null,
    username: fallbackUsername,
  })

  if (profileError) {
    return { user: null, error: profileError.message }
  }

  return { user, error: null }
}
