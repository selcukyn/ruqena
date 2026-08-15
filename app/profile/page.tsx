'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { dataService } from '@/lib/dataService'
import { EnrichedWorkout } from '@/types/app'
import { Achievement, UserAchievement } from '@/types/database'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { Flame, Activity, Award, Edit3, X, Check, Camera, User, Sparkles, Target, AlertCircle } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
]

function CurrentUserProfilePageContent() {
  const { profile: user, refreshProfile } = useAuth()
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  
  // Full Profile Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editWeeklyGoal, setEditWeeklyGoal] = useState(3)
  const [editBio, setEditBio] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user?.id) {
      setEditDisplayName(user.display_name || '')
      setEditUsername(user.username || '')
      setEditAvatarUrl(user.avatar_url || AVATAR_OPTIONS[0])
      setEditWeeklyGoal(user.weekly_goal || 3)
      setEditBio(user.bio || '')

      dataService.getUserWorkouts(user.id).then(setWorkouts)
      dataService.getAchievements().then(setAchievements)
      dataService.getUserAchievements(user.id).then(setUserAchievements)
    }
  }, [user?.id, user?.display_name, user?.username, user?.avatar_url, user?.weekly_goal, user?.bio])

  const handleOpenEdit = () => {
    if (user) {
      setEditDisplayName(user.display_name || '')
      setEditUsername(user.username || '')
      setEditAvatarUrl(user.avatar_url || AVATAR_OPTIONS[0])
      setEditWeeklyGoal(user.weekly_goal || 3)
      setEditBio(user.bio || '')
      setEditError(null)
      setIsEditingProfile(true)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setEditError(null)

    const cleanDisplayName = editDisplayName.trim()
    const cleanUsername = editUsername.trim().toLowerCase()

    if (!cleanDisplayName) {
      setEditError('Görünen ad boş bırakılamaz.')
      return
    }

    if (!cleanUsername) {
      setEditError('Kullanıcı adı boş bırakılamaz.')
      return
    }

    const usernameRegex = /^[a-z0-9_]{3,30}$/
    if (!usernameRegex.test(cleanUsername)) {
      setEditError('Kullanıcı adı 3-30 karakter arasında olmalı ve yalnızca küçük harf, rakam veya alt çizgi (_) içermelidir.')
      return
    }

    setSavingProfile(true)
    try {
      // Check duplicate username if username has changed
      if (cleanUsername !== user.username.toLowerCase()) {
        const existing = await dataService.getProfileByUsername(cleanUsername)
        if (existing && existing.id !== user.id) {
          setEditError('Bu kullanıcı adı başka bir sporcu tarafından kullanılıyor.')
          setSavingProfile(false)
          return
        }
      }

      await dataService.updateCurrentUserProfile(user.id, {
        display_name: cleanDisplayName,
        username: cleanUsername,
        avatar_url: editAvatarUrl,
        weekly_goal: editWeeklyGoal,
        bio: editBio.trim() || null,
      })

      await refreshProfile()
      setIsEditingProfile(false)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setEditError(err.message || 'Profil güncellenirken bir sorun oluştu.')
    } finally {
      setSavingProfile(false)
    }
  }

  if (!user) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Profil Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="relative">
            <img
              src={user.avatar_url || AVATAR_OPTIONS[0]}
              alt={user.display_name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-slate-950 p-1 rounded-full border border-slate-800">
              <Flame className="w-5 h-5 fill-orange-400 text-orange-400 flame-glow" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">{user.display_name}</h1>
                <p className="text-xs text-slate-400 font-medium">@{user.username}</p>
              </div>

              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors text-xs font-bold shadow-sm"
                title="Profili Düzenle"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Profili Düzenle</span>
              </button>
            </div>

            {user.bio && (
              <p className="text-xs text-slate-300 font-normal max-w-lg">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-slate-800/80 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-white block">{workouts.length}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Antrenman</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-orange-400 block">{user.current_streak}d</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Aktif Seri</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-emerald-400 block">{user.weekly_goal}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Haftalık Hedef</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-purple-400 block">{user.total_xp}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">XP</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>Profili Düzenle</span>
              </h2>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Profil Fotoğrafı</label>
              <div className="flex items-center justify-around gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                {AVATAR_OPTIONS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditAvatarUrl(url)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                      editAvatarUrl === url
                        ? 'border-emerald-400 scale-110 shadow-lg shadow-emerald-500/30'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                    {editAvatarUrl === url && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Görünen Ad</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Ahmet Kaya"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kullanıcı Adı (@)</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ahmet_run"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">3-30 karakter, küçük harfler, sayılar ve alt çizgi.</p>
            </div>

            {/* Weekly Goal */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Haftalık Hedef (Antrenman / Hafta)</label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditWeeklyGoal(g)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editWeeklyGoal === g
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {g} Gün
                  </button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hakkımda / Bio</label>
              <textarea
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Maraton koşucusu ve fitness tutkunu 🏃‍♂️⚡"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md hover:from-emerald-400 hover:to-teal-300 transition-all disabled:opacity-50"
              >
                {savingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Section */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Rozetlerim & Başarımlar</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {achievements.map((ach) => {
            // Check real unlock status strictly against database and user metrics
            const isExplicitlyUnlocked = userAchievements.some(
              (ua) => ua.achievement_id === ach.id || (ua as any).achievement?.key === ach.key
            )
            const isCriteriaMet =
              (ach.key === 'first_workout' && workouts.length >= 1) ||
              (ach.key === 'streak_7' && (user.current_streak >= 7 || user.longest_streak >= 7)) ||
              (ach.key === 'workouts_10' && workouts.length >= 10) ||
              (ach.key === 'workouts_25' && workouts.length >= 25) ||
              (ach.key === 'workouts_50' && workouts.length >= 50)

            const isUnlocked = isExplicitlyUnlocked || isCriteriaMet

            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  isUnlocked
                    ? 'bg-amber-500/10 border-amber-500/30 text-white'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-600 opacity-40'
                }`}
              >
                <span className="text-2xl block mb-1">{ach.icon}</span>
                <span className="text-xs font-bold block truncate">{ach.title}</span>
                <span className="text-[9px] text-slate-400 line-clamp-1">{ach.description}</span>
                {!isUnlocked && (
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 mt-1 block">Kilitli 🔒</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Workout History Section */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Antrenmanlarım ({workouts.length})</span>
        </h2>

        {workouts.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 text-xs text-slate-400">
            Henüz kaydedilmiş antrenman bulunmuyor.
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((w) => (
              <WorkoutCard
                key={w.id}
                workout={w}
                onDelete={(deletedId) => setWorkouts((prev) => prev.filter((item) => item.id !== deletedId))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CurrentUserProfilePage() {
  return (
    <ProtectedRoute>
      <CurrentUserProfilePageContent />
    </ProtectedRoute>
  )
}
