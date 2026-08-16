'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Flame, Trophy, ChevronRight, Activity, Sparkles, TrendingUp, LogOut } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { EnrichedWorkout, EnrichedChallenge } from '@/types/app'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { EmptyState } from '@/components/common/EmptyState'
import { getMotivationalCopy } from '@/lib/gamification'
import { useAuth } from '@/components/providers/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function HomePageContent() {
  const router = useRouter()
  const { profile: user, signOut } = useAuth()
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([])
  const [challenges, setChallenges] = useState<EnrichedChallenge[]>([])
  const [dataLoading, setDataLoading] = useState(true)
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

  if (dataLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Akış Yükleniyor...</p>
      </div>
    )
  }

  const motivationalMsg = getMotivationalCopy({
    weeklyCount: workouts.length,
    weeklyGoal: user?.weekly_goal || 3,
    streak: user?.current_streak || 0,
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#121826] to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hoş Geldin, {user?.display_name || 'Sporcu'}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors disabled:opacity-50 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Çıkış...' : 'Çıkış Yap'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bugün ne çalışıyoruz? 💪
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
                {motivationalMsg}
              </p>
            </div>

            <Link
              href="/workouts/new"
              className="self-start sm:self-auto shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Antrenman Ekle</span>
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium">Seri ⚡</span>
            <span className="text-lg sm:text-xl font-black text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              {user?.current_streak || 0} Gün
            </span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium">Haftalık Hedef</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">
              {user?.weekly_goal || 3} Gün
            </span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium">Toplam XP</span>
            <span className="text-lg sm:text-xl font-black text-teal-400">
              {user?.total_xp || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Active Challenges Widget */}
      {challenges.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Aktif Yarışlar & Challenge</span>
            </h2>
            <Link
              href="/challenges"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
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
                className="group p-4 rounded-2xl bg-[#121826]/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {chg.challenge_type === 'count'
                        ? 'Antrenman Sayısı'
                        : chg.challenge_type === 'duration'
                        ? 'Süre Hedefi'
                        : 'Mesafe Hedefi'}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                      {chg.title}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {chg.days_remaining} gün kaldı
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Hedef: {chg.target_value}</span>
                  <span className="text-emerald-400 font-medium">{chg.members.length} Katılımcı</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Feed Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Topluluk Akışı</span>
          </h2>
          <span className="text-xs text-slate-400">{workouts.length} Antrenman</span>
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
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onDelete={(id) => setWorkouts((prev) => prev.filter((w) => w.id !== id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomePageContent />
    </ProtectedRoute>
  )
}
