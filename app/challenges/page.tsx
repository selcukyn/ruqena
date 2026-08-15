'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Plus, Clock, Users, ChevronRight, Target, Flame } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { EnrichedChallenge } from '@/types/app'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function ChallengesPageContent() {
  const [challenges, setChallenges] = useState<EnrichedChallenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    dataService.getChallenges().then((chgs) => {
      if (isMounted) {
        setChallenges(chgs)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Yarışlar Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Challenge & Yarışlar 🏆</h1>
            <p className="text-xs text-slate-400">Arkadaşlarına meydan oku, hedefleri birlikte devir!</p>
          </div>
        </div>

        <Link
          href="/challenges/new"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Yarış Oluştur</span>
        </Link>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {challenges.map((chg) => {
          const userProgress = chg.user_progress || 0
          const progressPercent = Math.min(100, Math.round((userProgress / chg.target_value) * 100))

          return (
            <Link
              key={chg.id}
              href={`/challenges/${chg.id}`}
              className="glass-card glass-card-interactive block rounded-3xl p-5 sm:p-6 border border-slate-800/80 hover:border-amber-500/30 transition-all shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  {chg.creator && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <img
                        src={chg.creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={chg.creator.display_name}
                        className="w-5 h-5 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold">{chg.creator.display_name} başlattı</span>
                    </div>
                  )}
                  <h3 className="font-extrabold text-white text-base sm:text-lg mb-1">{chg.title}</h3>
                  <p className="text-xs text-slate-400">{chg.description}</p>
                </div>

                <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{chg.days_remaining} gün kaldı</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 my-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Senin İlerlemen</span>
                  </span>
                  <span className="text-amber-400 font-bold">
                    {userProgress} / {chg.target_value}{' '}
                    {chg.challenge_type === 'distance'
                      ? 'km'
                      : chg.challenge_type === 'duration'
                      ? 'dk'
                      : 'antrenman'}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-md shadow-amber-500/30"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Footer info & Participant avatars */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {chg.members.slice(0, 4).map((m, idx) => (
                      <img
                        key={idx}
                        src={m.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={m.user.display_name}
                        className="w-7 h-7 rounded-full border-2 border-[#121826] object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-slate-400 font-medium">{chg.members.length} yarışmacı</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Detaylar</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function ChallengesPage() {
  return (
    <ProtectedRoute>
      <ChallengesPageContent />
    </ProtectedRoute>
  )
}
