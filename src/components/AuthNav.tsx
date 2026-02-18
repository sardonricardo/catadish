'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthNav() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsAuthenticated(Boolean(data.session))
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    setLoadingLogout(true)
    await supabase.auth.signOut()
    setLoadingLogout(false)
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
      {isAuthenticated && (
        <>
          <Link href="/groups" className="hover:text-slate-900">
            Grupos
          </Link>
          <Link href="/" className="hover:text-slate-900">
            Restaurantes
          </Link>
        </>
      )}

      {isAuthenticated ? (
        <button
          type="button"
          onClick={handleLogout}
          disabled={loadingLogout}
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
        >
          {loadingLogout ? 'Saliendo...' : 'Salir'}
        </button>
      ) : (
        <>
          <Link href="/auth/login" className="hover:text-slate-900">
            Entrar
          </Link>
          <Link href="/auth/signup" className="hover:text-slate-900">
            Únete
          </Link>
        </>
      )}
    </nav>
  )
}
