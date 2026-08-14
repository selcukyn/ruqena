'use client'

import { useParams } from 'next/navigation'
import { dataService } from '@/lib/dataService'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { Flame, Trophy, Activity, Target, UserCheck, ShieldCheck } from 'lucide-react'

export default function UserProfilePage() {
  const params = useParams()
  const username = params?.username as string
  const profile = dataService.getProfileByUsername(username)
  const me = dataService.getCurrentUser()

  if (!profile) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 my-8">
        <h2 className="text-xl font-bold text-white mb-1">Kullanıcı Bulunamadı 🔍</h2>
        <p className="text-xs text-slate-400">Aradığın kullanıcı RUQENA platformunda bulunamadı.</p>
      </div>
    )
  }

  const workouts = dataService.getUserWorkouts(profile.id)
  const isMe = me.id === profile.id

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="relative">
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={profile.display_name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-slate-950 p-1 rounded-full border border-slate-800">
              <Flame className="w-5 h-5 fill-orange-400 text-orange-400 flame-glow" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">{profile.display_name}</h1>
              <p className="text-xs text-slate-400 font-medium">@{profile.username}</p>
            </div>

            {profile.bio && (
              <p className="text-xs text-slate-300 font-normal max-w-lg">{profile.bio}</p>
            )}

            {!isMe && (
              <div className="pt-2 flex justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <UserCheck className="w-4 h-4" />
                  <span>Arkadaşsınız</span>
                </span>
              </div>
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
            <span className="text-lg font-black text-orange-400 block">{profile.current_streak}d</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Aktif Seri</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-emerald-400 block">{profile.weekly_goal}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Haftalık Hedef</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-lg font-black text-purple-400 block">{profile.total_xp}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">XP</span>
          </div>
        </div>
      </div>

      {/* Workout History Section */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Antrenman Geçmişi ({workouts.length})</span>
        </h2>

        {workouts.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 text-xs text-slate-400">
            Henüz kaydedilmiş antrenman bulunmuyor.
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
