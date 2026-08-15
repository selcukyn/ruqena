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
  ) => Promise<{ error: Error | null; user: User | null; session: Session | null }>
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function isOnboardingCompleted(profile: Profile | null): boolean {
  if (!profile) return false
  return profile.bio === 'ONBOARDED' || Boolean(profile.username && profile.display_name)
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

    const syncSession = async () => {
      if (!supabase) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        const u = session?.user || null
        setUser(u)
        await fetchProfileForUser(u)
      } catch (err) {
        console.error('Session sync error:', err)
      } finally {
        setLoading(false)
      }
    }

    // Initialize initial session
    syncSession()

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

    // Handle BFCache (Back-Forward Cache) page restoration
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        syncSession()
      }
    }

    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
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
    if (!supabase) return { error: new Error('Supabase is not configured'), user: null, session: null }
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: metadata.username,
          display_name: metadata.display_name,
          avatar_url: metadata.avatar_url || null,
        },
      },
    })
    if (error) {
      console.error('Supabase Auth signUp Error:', {
        message: error.message,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
      })
    }
    return {
      error: error ? (error as Error) : null,
      user: data?.user || null,
      session: data?.session || null,
    }
  }

  const resendConfirmationEmail = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase is not configured') }
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Supabase Auth signOut error:', error.message)
        }
      }
    } catch (err) {
      console.error('Unexpected error during signOut:', err)
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
    }
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
        resendConfirmationEmail,
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
