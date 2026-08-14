'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Flame, Trophy, UserPlus, Heart, Award, Smartphone } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { AppNotification } from '@/types/database'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    dataService.getNotifications()
  )
  const [pushEnabled, setPushEnabled] = useState(false)

  const handleMarkAllRead = () => {
    dataService.markAllNotificationsAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleTogglePush = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          setPushEnabled(true)
        }
      })
    } else {
      setPushEnabled(!pushEnabled)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'WORKOUT_REACTION':
        return <Flame className="w-5 h-5 fill-orange-400 text-orange-400" />
      case 'CHALLENGE_INVITE':
      case 'CHALLENGE_COMPLETED':
        return <Trophy className="w-5 h-5 text-amber-400" />
      case 'FRIEND_ACCEPTED':
      case 'FRIEND_REQUEST':
        return <UserPlus className="w-5 h-5 text-emerald-400" />
      case 'ACHIEVEMENT_UNLOCKED':
        return <Award className="w-5 h-5 text-purple-400" />
      default:
        return <Bell className="w-5 h-5 text-slate-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Bell className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Bildirimler 🔔</h1>
            <p className="text-xs text-slate-400">Arkadaşlarından gelen tepkiler ve yarış davetleri.</p>
          </div>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Tümünü Okundu İşaretle</span>
          </button>
        )}
      </div>

      {/* Web Push Notification Info Card */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Anlık Bildirimler (Push)</span>
            <span className="text-[10px] text-slate-400">
              Antrenman tepkilerini telefonuna anında bildirim olarak al.
            </span>
          </div>
        </div>

        <button
          onClick={handleTogglePush}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            pushEnabled
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {pushEnabled ? 'Açık ✓' : 'Etkinleştir'}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 text-xs text-slate-400">
            Henüz bildirim bulunmuyor.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`glass-card rounded-2xl p-4 border flex items-start gap-3.5 transition-all ${
                !notif.is_read
                  ? 'border-emerald-500/30 bg-emerald-500/5 shadow-md'
                  : 'border-slate-800/80 opacity-80'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-sm truncate">{notif.title}</h3>
                  <span className="text-[10px] text-slate-500">
                    {new Date(notif.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{notif.message}</p>
              </div>

              {!notif.is_read && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
