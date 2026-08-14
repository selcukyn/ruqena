'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Trophy, Clock, Target, Users, Flame, Check, UserPlus } from 'lucide-react'
import { dataService } from '@/lib/dataService'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { EnrichedChallenge } from '@/types/app'

export default function ChallengeDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<EnrichedChallenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinError, setJoinError] = useState<string | null>(null)

  const reloadChallenge = async () => {
    if (!id) return
    const chg = await dataService.getChallengeById(id)
    setChallenge(chg)
  }

  useEffect(() => {
    reloadChallenge().finally(() => setLoading(false))
  }, [id])

  const handleJoin = async () => {
    if (!challenge) return
    setJoinError(null)
    try {
      await dataService.joinChallenge(challenge.id)
      await reloadChallenge()
    } catch (err: any) {
      setJoinError(err.message || 'Yarışa katılırken bir hata oluştu.')
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Yarış Detayı Yükleniyor...</p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 my-8">
        <h2 className="text-xl font-bold text-white mb-1">Challenge Bulunamadı 🔍</h2>
        <p className="text-xs text-slate-400">Bu meydan okuma artık mevcut değil veya silinmiş olabilir.</p>
      </div>
    )
  }

  const currentUserId = user?.id || ''
  const isMember = challenge.is_user_member || challenge.members.some((m) => m.user_id === currentUserId)

  // Sort members by progress descending
  const sortedMembers = [...challenge.members].sort((a, b) => b.progress - a.progress)
  const leader = sortedMembers[0]
  const userRank = sortedMembers.findIndex((m) => m.user_id === currentUserId) + 1
  const userMember = sortedMembers.find((m) => m.user_id === currentUserId)

  // Motivational copy for current user
  let motivationalMessage = 'Harika gidiyorsun! Antrenmanlarına devam et.'
  if (leader && leader.user_id !== currentUserId && userMember) {
    const diff = leader.progress - userMember.progress
    motivationalMessage = `${leader.user.display_name.split(' ')[0]}'e yetişmek için ${diff > 0 ? diff : 1} ${
      challenge.challenge_type === 'distance'
        ? 'km'
        : challenge.challenge_type === 'duration'
        ? 'dk'
        : 'antrenman'
    } kaldı! 🔥`
  }

  return (
    <div className="space-y-6">
      {/* Challenge Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 space-y-4 relative overflow-hidden bg-gradient-to-br from-amber-950/30 via-[#121826] to-[#121826]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 mb-2 inline-block">
              {challenge.challenge_type === 'count'
                ? 'Antrenman Hedefi'
                : challenge.challenge_type === 'duration'
                ? 'Süre Hedefi'
                : 'Mesafe Hedefi'}
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">{challenge.title}</h1>
            {challenge.description && (
              <p className="text-xs text-slate-300 mt-1 max-w-xl">{challenge.description}</p>
            )}
          </div>

          {!isMember ? (
            <button
              onClick={handleJoin}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
            >
              <UserPlus className="w-4 h-4" />
              <span>Yarışa Katıl</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Katıldın</span>
            </span>
          )}
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{challenge.days_remaining} gün kaldı</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Hedef: {challenge.target_value}</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-400" />
            <span>{challenge.members.length} Yarışmacı</span>
          </span>
        </div>
      </div>

        {joinError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {joinError}
          </div>
        )}

        {/* Motivational Alert Banner */}
      {isMember && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 fill-emerald-400 shrink-0" />
          <span>{motivationalMessage}</span>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Yarışçı Sıralaması ({sortedMembers.length})</span>
        </h2>

        <div className="space-y-2">
          {sortedMembers.map((member, idx) => {
            const rank = idx + 1
            const isMeMember = member.user_id === currentUserId
            const progressPercent = Math.min(
              100,
              Math.round((member.progress / challenge.target_value) * 100)
            )

            return (
              <div
                key={member.id}
                className={`glass-card rounded-2xl p-4 border flex items-center justify-between transition-all ${
                  isMeMember
                    ? 'border-emerald-500/40 bg-emerald-500/5 shadow-md'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-4">
                  {/* Rank badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </div>

                  <img
                    src={member.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={member.user.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {member.user.display_name}
                      </span>
                      {isMeMember && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Sen
                        </span>
                      )}
                    </div>
                    {/* Small progress bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-white text-sm block">
                    {member.progress} / {challenge.target_value}
                  </span>
                  <span className="text-[10px] text-slate-400">%{progressPercent} tamamlandı</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
