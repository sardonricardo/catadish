'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ensureCurrentUserProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

type InviteRow = {
  id: string
  group_id: string
  email: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
}

type GroupRow = {
  id: string
  name: string
}

export default function InviteTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [group, setGroup] = useState<GroupRow | null>(null)

  useEffect(() => {
    const loadInvite = async () => {
      const { user, error: userError } = await ensureCurrentUserProfile()

      if (!user) {
        setLoading(false)
        setError(userError ?? 'Necesitas una cuenta para entrar al círculo.')
        router.push(`/auth/signup?next=${encodeURIComponent(`/invite/${token}`)}`)
        return
      }

      const { data: inviteData, error: inviteError } = await supabase
        .from('group_invites')
        .select('id, group_id, email, status, expires_at')
        .eq('token', token)
        .single()

      if (inviteError || !inviteData) {
        setError(inviteError?.message ?? 'Invite no válido.')
        setLoading(false)
        return
      }

      const invite = inviteData as InviteRow

      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', invite.group_id)
        .single()

      if (groupError || !groupData) {
        setError(groupError?.message ?? 'No se encontró el círculo.')
        setLoading(false)
        return
      }

      setGroup(groupData as GroupRow)
      setLoading(false)
    }

    loadInvite()
  }, [router, token])

  const handleJoin = async () => {
    setError(null)
    setSuccess(null)
    setJoining(true)

    const { data, error: joinError } = await supabase.rpc('accept_group_invite', {
      _token: token,
    })

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    const joinedGroupId = data as string
    setSuccess('Ya estás dentro del círculo.')
    setJoining(false)
    router.push(`/groups/${joinedGroupId}`)
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <Link href="/groups" className="text-sm font-semibold text-slate-700 underline">
        Volver a círculos
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Invite a círculo</h1>

        {loading && <p className="text-sm text-slate-600">Validando invite...</p>}

        {!loading && group && (
          <>
            <p className="text-slate-700">
              Te han invitado a entrar en <span className="font-semibold">{group.name}</span>.
            </p>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {joining ? 'Entrando...' : 'Entrar al círculo'}
            </button>
          </>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
      </div>
    </section>
  )
}
