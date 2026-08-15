'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, isOnboardingCompleted } from '@/components/providers/AuthProvider'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user: authUser, profile, loading: authLoading, isConfigured } = useAuth()

  useEffect(() => {
    if (authLoading) return

    if (isConfigured && !authUser) {
      router.push('/login')
      return
    }

    if (isConfigured && authUser && profile && !isOnboardingCompleted(profile)) {
      router.push('/onboarding')
      return
    }
  }, [authLoading, authUser, profile, isConfigured, router])

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Oturum doğrulanıyor...</p>
      </div>
    )
  }

  if (isConfigured && !authUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Giriş sayfasına yönlendiriliyor...</p>
      </div>
    )
  }

  if (isConfigured && authUser && profile && !isOnboardingCompleted(profile)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Kurulum sayfasına yönlendiriliyor...</p>
      </div>
    )
  }

  return <>{children}</>
}
