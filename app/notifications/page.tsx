'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Flame, Trophy, UserPlus, Heart, Award, Smartphone } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { AppNotification } from '@/types/database'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function NotificationsPageContent() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'default'>('default')

  useEffect(() => {
    if (user?.id) {
      dataService.getNotifications(user.id).then(setNotifications)
    }

    // Check actual browser notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        // Register SW to ensure it's available, then check subscription
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub && user?.id) {
              // Verify with DB
              dataService.checkPushSubscription(user.id, sub.endpoint).then((isValid) => {
                setPushStatus(isValid ? 'granted' : 'default')
              }).catch(() => setPushStatus('default'))
            } else {
              setPushStatus('default')
            }
          }).catch(() => setPushStatus('default'))
        }).catch(() => setPushStatus('default'))
      } else {
        setPushStatus(Notification.permission)
      }
    }
  }, [user?.id])

  const handleMarkAllRead = async () => {
    if (!user) return
    await dataService.markAllNotificationsAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleRespondChallenge = async (notifId: string, status: 'accepted' | 'rejected') => {
    try {
      await dataService.respondChallengeInvite(notifId, status)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notifId ? { ...n, action_status: status, is_read: true } : n
        )
      )
    } catch (error: any) {
      alert('İşlem başarısız: ' + error.message)
    }
  }

  const handleTogglePush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'denied') {
        alert('Bildirimler tarayıcı ayarlarından engellenmiş. Lütfen tarayıcı ayarlarından izin verin.')
        return
      }

      try {
        if (pushStatus === 'granted') {
          // Kapatma / Disable akışı
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await sub.unsubscribe()
            if (user?.id) {
              await dataService.deletePushSubscription(sub.endpoint)
            }
          }
          setPushStatus('default')
          return
        }

        // Açma / Enable akışı
        const perm = await Notification.requestPermission()
        
        if (perm === 'granted' && user?.id) {
          const reg = await navigator.serviceWorker.register('/sw.js')
          await navigator.serviceWorker.ready
          
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
              console.warn('VAPID public key eksik, abonelik oluşturulamıyor.')
              return
            }
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })
          }
          
          await dataService.savePushSubscription(user.id, sub)
          // Sadece her şey başarılı olduktan sonra "Etkinleştirildi" durumuna geç.
          setPushStatus('granted')
        } else {
          setPushStatus(perm)
        }
      } catch (err: any) {
        console.error('Push aboneliği hatası:', err)
        alert('İşlem sırasında bir hata oluştu: ' + err.message)
        // Hata durumunda UI'ı eski güvenli haline getir (Brave hatası vb. durumlar için)
        setPushStatus((prev) => prev === 'granted' ? 'granted' : 'default')
      }
    } else {
      alert('Tarayıcınız bildirimleri desteklemiyor.')
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
          disabled={pushStatus === 'denied'}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            pushStatus === 'granted'
              ? 'bg-emerald-500 text-slate-950'
              : pushStatus === 'denied'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 opacity-60 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          {pushStatus === 'granted' ? 'Açık ✓' : pushStatus === 'denied' ? 'Engellendi' : 'Etkinleştir'}
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
                {notif.type === 'CHALLENGE_INVITE' && notif.action_status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleRespondChallenge(notif.id, 'accepted')}
                      className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold transition-all hover:bg-emerald-400"
                    >
                      Kabul Et
                    </button>
                    <button
                      onClick={() => handleRespondChallenge(notif.id, 'rejected')}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all hover:bg-slate-700"
                    >
                      Reddet
                    </button>
                  </div>
                )}
                {notif.type === 'CHALLENGE_INVITE' && notif.action_status === 'accepted' && (
                  <div className="mt-3 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4" /> Challenge'a katıldın.
                  </div>
                )}
                {notif.type === 'CHALLENGE_INVITE' && notif.action_status === 'rejected' && (
                  <div className="mt-3 text-xs font-bold text-slate-500">Challenge daveti reddedildi.</div>
                )}
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

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsPageContent />
    </ProtectedRoute>
  )
}
