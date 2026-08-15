'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Shield, Bell, LogOut, User, Moon, ChevronRight } from 'lucide-react'
import { dataService } from '@/lib/dataService'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function SettingsPageContent() {
  const router = useRouter()
  const { profile: user, signOut, refreshProfile } = useAuth()
  const [bio, setBio] = useState(user?.bio || '')

  useEffect(() => {
    if (user?.bio) setBio(user.bio)
  }, [user?.bio])

  const handleSaveBio = async () => {
    if (!user) return
    await dataService.updateCurrentUserProfile(user.id, { bio })
    await refreshProfile()
    alert('Profil güncellendi!')
  }

  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
      alert('Çıkış yapılırken bir sorun oluştu. Lütfen tekrar deneyin.')
      setLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-white font-black shadow-lg">
          <Settings className="w-6 h-6 stroke-[2]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Ayarlar ⚙️</h1>
          <p className="text-xs text-slate-400">Hesap tercihlerini ve gizliliğini yönet.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Profile Info Section */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Profil Bilgileri</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hakkımda / Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Maraton koşucusu ve fitness tutkunu 🏃‍♂️⚡"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSaveBio}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md hover:bg-emerald-400 transition-colors"
          >
            Kaydet
          </button>
        </div>

        {/* Privacy & PWA info */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Gizlilik ve PWA Yetkileri</span>
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-300">Antrenman Görünürlüğü</span>
            <span className="text-emerald-400 font-bold">Sadece Arkadaşlarım</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-300">PWA Uygulama Durumu</span>
            <span className="text-emerald-400 font-bold">Yüklenebilir (Installable)</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          <span>{loggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}</span>
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
