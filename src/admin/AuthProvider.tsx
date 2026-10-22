import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

type AuthState = { user: User | null; isAdmin: boolean; loading: boolean; configured: boolean; refreshAdmin: (user: User | null) => Promise<void> }
const AuthContext = createContext<AuthState>({ user: null, isAdmin: false, loading: true, configured: hasSupabaseConfig, refreshAdmin: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: hasSupabaseConfig, configured: hasSupabaseConfig, refreshAdmin: async () => {} })
  const refreshAdmin = useCallback(async (user: User | null) => {
    const client = supabase
    if (!client) { setState({ user: null, isAdmin: false, loading: false, configured: false, refreshAdmin }); return }
    if (!user) { setState({ user: null, isAdmin: false, loading: false, configured: true, refreshAdmin }); return }
    setState({ user, isAdmin: false, loading: true, configured: true, refreshAdmin })
    const { data } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
    setState({ user, isAdmin: data?.role === 'admin', loading: false, configured: true, refreshAdmin })
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let alive = true
    const resolveAdmin = async (user: User | null) => {
      if (!user) {
        if (alive) setState({ user: null, isAdmin: false, loading: false, configured: true, refreshAdmin })
        return
      }
      if (alive) setState({ user, isAdmin: false, loading: true, configured: true, refreshAdmin })
      const { data } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (alive) setState({ user, isAdmin: data?.role === 'admin', loading: false, configured: true, refreshAdmin })
    }
    void client.auth.getSession().then(({ data }) => resolveAdmin(data.session?.user ?? null))
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => { void resolveAdmin(session?.user ?? null) })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [refreshAdmin])

  return <AuthContext.Provider value={{ ...state, refreshAdmin }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
