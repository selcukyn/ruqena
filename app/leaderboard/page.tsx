'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, Flame, Trophy, Crown, TrendingUp } from 'lucide-react'
import { dataService } from '@/lib/dataService'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { LeaderboardEntry } from '@/types/app'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    dataService.getLeaderboard(period).then(setLeaderboard)
  }, [period])

  const currentUserId = user?.id || ''
  const firstPlace = leaderboard[0]
  const secondPlace = leaderboard[1]
  const thirdPlace = leaderboard[2]
  const remaining = leaderboard.slice(3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-400/20">
          <Award className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Liderlik Tablosu 🏆</h1>
          <p className="text-xs text-slate-400">En aktif sporcular ve disiplin şampiyonları!</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
        {[
          { key: 'weekly', label: 'Bu Hafta' },
          { key: 'monthly', label: 'Bu Ay' },
          { key: 'alltime', label: 'Tüm Zamanlar' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key as any)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              period === t.key
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PODIUM DISPLAY (Top 3) */}
      <div className="grid grid-cols-3 gap-3 pt-6 pb-2 items-end max-w-lg mx-auto text-center">
        {/* 2nd Place */}
        {secondPlace && (
          <Link
            href={`/profile/${secondPlace.user.username}`}
            className="flex flex-col items-center group"
          >
            <div className="relative mb-2">
              <img
                src={secondPlace.user.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt={secondPlace.user.display_name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-300 shadow-xl group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                2
              </span>
            </div>
            <span className="font-bold text-white text-xs mt-2 truncate w-full group-hover:text-amber-400">
              {secondPlace.user.display_name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-amber-400 font-bold">{secondPlace.metric_label}</span>
          </Link>
        )}

        {/* 1st Place (Center) */}
        {firstPlace && (
          <Link
            href={`/profile/${firstPlace.user.username}`}
            className="flex flex-col items-center -top-4 relative group"
          >
            <div className="relative mb-2">
              <div className="absolute -top-6 inset-x-0 mx-auto flex justify-center text-amber-400 animate-bounce">
                <Crown className="w-6 h-6 fill-amber-400" />
              </div>
              <img
                src={firstPlace.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={firstPlace.user.display_name}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-4 border-amber-400 shadow-2xl shadow-amber-400/30 group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                1
              </span>
            </div>
            <span className="font-extrabold text-white text-sm mt-3 truncate w-full group-hover:text-amber-400">
              {firstPlace.user.display_name.split(' ')[0]}
            </span>
            <span className="text-xs text-amber-400 font-black">{firstPlace.metric_label}</span>
          </Link>
        )}

        {/* 3rd Place */}
        {thirdPlace && (
          <Link
            href={`/profile/${thirdPlace.user.username}`}
            className="flex flex-col items-center group"
          >
            <div className="relative mb-2">
              <img
                src={thirdPlace.user.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                alt={thirdPlace.user.display_name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-700 shadow-xl group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                3
              </span>
            </div>
            <span className="font-bold text-white text-xs mt-2 truncate w-full group-hover:text-amber-400">
              {thirdPlace.user.display_name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-amber-400 font-bold">{thirdPlace.metric_label}</span>
          </Link>
        )}
      </div>

      {/* FULL RANKING LIST */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tüm Sıralama</h2>

        {leaderboard.map((entry) => {
          const isMe = entry.user.id === currentUserId
          return (
            <Link
              key={entry.user.id}
              href={`/profile/${entry.user.username}`}
              className={`glass-card rounded-2xl p-4 border flex items-center justify-between transition-all group ${
                isMe ? 'border-emerald-500/40 bg-emerald-500/5 shadow-md' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="w-6 font-black text-xs text-slate-400 text-center">#{entry.rank}</span>

                <img
                  src={entry.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={entry.user.display_name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                      {entry.user.display_name}
                    </span>
                    {isMe && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Sen
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">@{entry.user.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="flex items-center gap-1 text-orange-400 text-xs font-bold bg-orange-500/10 px-2 py-0.5 rounded-md">
                  <Flame className="w-3.5 h-3.5 fill-orange-400" />
                  <span>{entry.streak}d</span>
                </div>

                <div className="min-w-[80px]">
                  <span className="font-black text-amber-400 text-sm block">{entry.metric_value}</span>
                  <span className="text-[10px] text-slate-400">Antrenman</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
