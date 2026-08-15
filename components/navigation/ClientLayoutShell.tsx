'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Header } from '@/components/navigation/Header'
import { BottomNav } from '@/components/navigation/BottomNav'
import { useAuth } from '@/components/providers/AuthProvider'

const AUTH_PATHS = ['/login', '/register', '/onboarding']

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading, isConfigured } = useAuth()
  const isAuthPage = AUTH_PATHS.includes(pathname) || pathname.startsWith('/auth')

  // Show clean layout without navigation bars for Auth pages or unauthenticated users
  if (isAuthPage || (isConfigured && !user) || loading) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#090d16]">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    )
  }

  // Authenticated full app layout with navigation bars
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 md:py-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}
