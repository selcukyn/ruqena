'use client'

import Link from 'next/link'
import { Flame, Bell, Activity } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/AuthProvider'

export function Header() {
  const { profile, user: authUser } = useAuth()
  const currentStreak = profile?.current_streak ?? 0
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (authUser?.id) {
      dataService.getNotifications(authUser.id).then((notifs) => {
        setUnreadCount(notifs.filter((n) => !n.is_read).length)
      })
    }
  }, [authUser?.id])

  return (
    <header className="md:hidden sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link href="/home" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-emerald-500/20">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="text-lg font-black tracking-tight text-white">RUQENA</span>
      </Link>

      {/* Right Stats & Bell */}
      <div className="flex items-center gap-3">
        {/* Streak Counter Badge */}
        <Link
          href="/profile"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold shadow-sm"
        >
          <Flame className="w-4 h-4 fill-orange-400 text-orange-400 flame-glow" />
          <span>{currentStreak} Gün Seri</span>
        </Link>

        {/* Bell Icon */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/40 border border-slate-800"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#090d16]" />
          )}
        </Link>
      </div>
    </header>
  )
}
