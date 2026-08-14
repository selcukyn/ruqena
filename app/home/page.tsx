'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Flame, Trophy, ChevronRight, Activity, Sparkles, TrendingUp } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { EnrichedWorkout, EnrichedChallenge } from '@/types/app'
import { Profile } from '@/types/database'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { EmptyState } from '@/components/common/EmptyState'
import { getMotivationalCopy } from '@/lib/gamification'

import { useAuth } from '@/components/providers/AuthProvider'

export default function HomePage() {
  const { profile: user, loading: authLoading } = useAuth()
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([])
  const [challenges, setChallenges] = useState<EnrichedChallenge[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const [w, c] = await Promise.all([
          dataService.getFeedWorkouts(),
          dataService.getChallenges(),
        ])
        if (isMounted) {
          setWorkouts(w)
          setChallenges(c)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (isMounted) setDataLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  if (authLoading || dataLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Akış Yükleniyor...</p>
      </div>
    )
  }

  if (!user) return null

  // Calculate user weekly progress
  const userWeeklyWorkouts = workouts.filter((w) => {
    if (w.user_id !== user.id) return false
    const wDate = new Date(w.created_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - wDate.getTime()) / (1000 * 3600 * 24))
    return diffDays < 7
  })

  const weeklyCount = userWeeklyWorkouts.length
  const weeklyGoal = user.weekly_goal || 4
  const progressPercent = Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100))

  return (
    <div className="space-y-6">
      {/* User Greeting & Weekly Progress Card */}
      <section className="relative overflow-hidden glass-card rounded-3xl p-5 sm:p-6 border border-emerald-500/20 shadow-2xl bg-gradient-to-br from-emerald-950/40 via-[#121826] to-[#121826]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Selam {user.display_name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{getMotivationalCopy({ weeklyCount, weeklyGoal, streak: user.current_streak })}</span>
            </p>
          </div>

          <Link
            href="/workouts/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Antrenman Ekle</span>
          </Link>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Bu Haftaki Hedef</span>
            <span className="text-emerald-400 font-bold">
              {weeklyCount} / {weeklyGoal} Antrenman (%{progressPercent})
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-md shadow-emerald-500/30"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Streak & XP Badges Row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-5 h-5 fill-orange-400 text-orange-400 flame-glow" />
            <div>
              <span className="text-orange-400 font-bold block">{user.current_streak} Gün Seri</span>
              <span className="text-[10px] text-slate-400">En uzun: {user.longest_streak} gün</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div>
              <span className="text-purple-400 font-bold block">{user.total_xp} XP</span>
              <span className="text-[10px] text-slate-400">Seviye {Math.floor(user.total_xp / 100) + 1}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Challenges Preview Section */}
      {challenges.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Aktif Yarışlar</span>
            </h2>
            <Link
              href="/challenges"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>Tümünü Gör</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {challenges.slice(0, 2).map((chg) => (
              <Link
                key={chg.id}
                href={`/challenges/${chg.id}`}
                className="glass-card glass-card-interactive rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{chg.title}</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {chg.days_remaining} gün kaldı
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{chg.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{chg.members.length} Katılımcı</span>
                  <span className="text-emerald-400 font-semibold">Sen: {chg.user_progress} / {chg.target_value}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Social Activity Feed Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Arkadaşlarından</span>
          </h2>
          <span className="text-xs text-slate-400">{workouts.length} antrenman</span>
        </div>

        {workouts.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Henüz antrenman yok"
            description="İlk antrenmanını kaydederek arkadaşlarına ilham ver!"
            actionLabel="+ Antrenman Ekle"
            actionHref="/workouts/new"
          />
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
