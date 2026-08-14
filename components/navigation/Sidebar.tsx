'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Award, Users, Bell, User, Plus, Flame, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dataService } from '@/lib/dataService'

export function Sidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const user = dataService.getCurrentUser()

  useEffect(() => {
    const notifs = dataService.getNotifications()
    setUnreadCount(notifs.filter((n) => !n.is_read).length)
  }, [pathname])

  const navItems = [
    { href: '/home', label: 'Ana Sayfa', icon: Home },
    { href: '/challenges', label: 'Yarışlar & Challenge', icon: Trophy },
    { href: '/leaderboard', label: 'Sıralama', icon: Award },
    { href: '/friends', label: 'Arkadaşlar', icon: Users },
    { href: '/notifications', label: 'Bildirimler', icon: Bell, badge: unreadCount },
    { href: '/profile', label: 'Profilim', icon: User },
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 left-0 bg-[#0d1320] border-r border-slate-800/80 p-4 z-40">
      {/* Brand Logo */}
      <Link href="/home" className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-xl shadow-lg shadow-emerald-500/20">
          <Activity className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <span className="text-xl font-black tracking-tight text-white block leading-none">RUQENA</span>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Social Fitness</span>
        </div>
      </Link>

      {/* Primary CTA */}
      <Link
        href="/workouts/new"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-[0.98] mb-6"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>Antrenman Ekle</span>
      </Link>

      {/* Main Nav Links */}
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge ? (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>

      {/* User Quick Info */}
      <div className="pt-4 border-t border-slate-800/80">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
        >
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={user.display_name}
            className="w-10 h-10 rounded-full object-cover border border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.display_name}</p>
            <p className="text-xs text-slate-400 truncate">@{user.username}</p>
          </div>
          <div className="flex items-center gap-1 text-orange-400 font-bold text-xs bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
            <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
            <span>{user.current_streak}d</span>
          </div>
        </Link>
      </div>
    </aside>
  )
}
