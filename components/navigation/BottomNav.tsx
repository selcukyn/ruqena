'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Plus, Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dataService } from '@/lib/dataService'

import { useAuth } from '@/components/providers/AuthProvider'

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user?.id) {
      dataService.getNotifications(user.id).then((notifs) => {
        setUnreadCount(notifs.filter((n) => !n.is_read).length)
      })
    }
  }, [pathname, user?.id])

  const navItems = [
    { href: '/home', label: 'Ana Sayfa', icon: Home },
    { href: '/challenges', label: 'Yarışlar', icon: Trophy },
    { href: '/workouts/new', label: 'Ekle', icon: Plus, isCta: true },
    { href: '/notifications', label: 'Bildirimler', icon: Bell, badge: unreadCount },
    { href: '/profile', label: 'Profil', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1320]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          const Icon = item.icon

          if (item.isCta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-4 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Antrenman Ekle"
              >
                <Plus className="w-8 h-8 stroke-[2.5]" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#0d1320] animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
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
