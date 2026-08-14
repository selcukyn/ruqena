'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { dataService } from '@/lib/dataService'
import { EnrichedWorkout } from '@/types/app'
import { Achievement } from '@/types/database'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { Flame, Activity, Award, Edit3 } from 'lucide-react'

export default function CurrentUserProfilePage() {
  const { profile: user, refreshProfile } = useAuth()
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [newGoal, setNewGoal] = useState(3)

  useEffect(() => {
    if (user?.id) {
      setNewGoal(user.weekly_goal || 3)
      dataService.getUserWorkouts(user.id).then(setWorkouts)
      dataService.getAchievements().then(setAchievements)
    }
  }, [user?.id, user?.weekly_goal])

  const handleSaveGoal = async () => {
    if (!user) return
    await dataService.updateCurrentUserProfile(user.id, { weekly_goal: newGoal })
    await refreshProfile()
    setIsEditingGoal(false)
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
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
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
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Hedef Düzenle"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {user.bio && (
              <p className="text-xs text-slate-300 font-normal max-w-lg">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Goal Edit Popup / Collapse */}
        {isEditingGoal && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-xs font-bold text-white">Haftalık Hedef (Antrenman/Hafta):</span>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  onClick={() => setNewGoal(g)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    newGoal === g
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
              <button
                onClick={handleSaveGoal}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold ml-2"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}

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

      {/* Achievements Section */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Rozetlerim & Başarımlar</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {achievements.map((ach, idx) => {
            const isUnlocked = idx < 4 // Demo unlocked state
            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  isUnlocked
                    ? 'bg-amber-500/10 border-amber-500/30 text-white'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-600 opacity-50'
                }`}
              >
                <span className="text-2xl block mb-1">{ach.icon}</span>
                <span className="text-xs font-bold block truncate">{ach.title}</span>
                <span className="text-[9px] text-slate-400 line-clamp-1">{ach.description}</span>
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

        <div className="space-y-4">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      </div>
    </div>
  )
}
