'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Plus, User, Award, Users } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/home', label: 'Akış', icon: Home },
    { href: '/challenges', label: 'Yarışlar', icon: Trophy },
    { href: '/leaderboard', label: 'Sıralama', icon: Award },
    { href: '/friends', label: 'Arkadaşlar', icon: Users },
    { href: '/profile', label: 'Profil', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1320]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.5)]">
      {/* Floating Centered CTA */}
      <Link
        href="/workouts/new"
        className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 ring-[6px] ring-[#0d1320]"
        aria-label="Antrenman Ekle"
      >
        <Plus className="w-8 h-8 stroke-[2.5]" />
      </Link>

      <div className="flex items-center justify-between max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/profile'
              ? pathname === '/profile'
              : pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[44px] py-1 px-0.5 rounded-xl transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-4 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
