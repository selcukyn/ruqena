'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { Profile } from '@/types/database'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { dataService } from '@/lib/dataService'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    pass: string,
    metadata: { username: string; display_name: string; avatar_url?: string }
  ) => Promise<{ error: Error | null; user: User | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProfileForUser = async (u: User | null) => {
    if (!u) {
      setProfile(null)
      return
    }
    try {
      const p = await dataService.getCurrentProfile(u.id)
      setProfile(p || null)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    // Initialize initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const u = session?.user || null
      setUser(u)
      fetchProfileForUser(u).finally(() => setLoading(false))
    })

    // Listen to Auth State changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      const u = session?.user || null
      setUser(u)
      await fetchProfileForUser(u)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, pass: string) => {
    if (!supabase) return { error: new Error('Supabase is not configured') }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (
    email: string,
    pass: string,
    metadata: { username: string; display_name: string; avatar_url?: string }
  ) => {
    if (!supabase) return { error: new Error('Supabase is not configured'), user: null }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          username: metadata.username,
          display_name: metadata.display_name,
          avatar_url: metadata.avatar_url || null,
        },
      },
    })
    return { error: error ? new Error(error.message) : null, user: data.user }
  }

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileForUser(user)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
