'use client'

import { useParams } from 'next/navigation'
import { dataService } from '@/lib/dataService'
import { WorkoutCard } from '@/components/feed/WorkoutCard'
import { Flame, Trophy, Activity, Target, UserCheck, UserPlus, Clock, Check, ShieldCheck } from 'lucide-react'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Profile, FriendRequest } from '@/types/database'
import { EnrichedWorkout } from '@/types/app'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function UserProfilePageContent() {
  const params = useParams()
  const rawUsername = params?.username as string
  const username = rawUsername ? decodeURIComponent(rawUsername) : ''
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([])
  const [loading, setLoading] = useState(true)

  // Friendship states
  const [isFriend, setIsFriend] = useState(false)
  const [hasOutgoingRequest, setHasOutgoingRequest] = useState(false)
  const [incomingRequest, setIncomingRequest] = useState<FriendRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadFriendshipStatus = async (targetUserId: string, currentUserId: string) => {
    try {
      const [friendsList, reqs] = await Promise.all([
        dataService.getFriends(currentUserId),
        dataService.getFriendRequests(currentUserId),
      ])

      const friendFound = friendsList.some((f) => f.id === targetUserId)
      setIsFriend(friendFound)

      const outgoing = reqs.outgoing.find((r) => r.receiver_id === targetUserId)
      setHasOutgoingRequest(Boolean(outgoing))

      const incoming = reqs.incoming.find((r) => r.sender_id === targetUserId)
      setIncomingRequest(incoming || null)
    } catch (err) {
      console.error('Error loading friendship status:', err)
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!username) return
      try {
        const targetProf = await dataService.getProfileByUsername(username)
        setProfile(targetProf)
        if (targetProf) {
          const w = await dataService.getUserWorkouts(targetProf.id)
          setWorkouts(w)

          if (currentUser?.id && currentUser.id !== targetProf.id) {
            await loadFriendshipStatus(targetProf.id, currentUser.id)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [username, currentUser?.id])

  const handleSendFriendRequest = async () => {
    if (!profile || !currentUser || actionLoading) return
    setActionLoading(true)
    try {
      await dataService.sendFriendRequest(profile.id)
      setHasOutgoingRequest(true)
    } catch (err: any) {
      console.error('Error sending friend request:', err)
      alert(err.message || 'Arkadaşlık isteği gönderilemedi.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptFriendRequest = async () => {
    if (!incomingRequest || actionLoading) return
    setActionLoading(true)
    try {
      await dataService.respondToFriendRequest(incomingRequest.id, 'accepted')
      setIsFriend(true)
      setIncomingRequest(null)
    } catch (err: any) {
      console.error('Error accepting friend request:', err)
      alert(err.message || 'Arkadaşlık isteği kabul edilemedi.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!profile || actionLoading) return
    if (!confirm('Arkadaşlıktan çıkarmak istediğinize emin misiniz?')) return
    setActionLoading(true)
    try {
      await dataService.removeFriend(profile.id)
      setIsFriend(false)
    } catch (err: any) {
      console.error('Error removing friend:', err)
      alert(err.message || 'Arkadaşlıktan çıkarılamadı.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Profil Yükleniyor...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 my-8">
        <h2 className="text-xl font-bold text-white mb-1">Kullanıcı Bulunamadı 🔍</h2>
        <p className="text-xs text-slate-400">Aradığın kullanıcı RUQENA platformunda bulunamadı.</p>
      </div>
    )
  }

  const isMe = currentUser?.id === profile.id

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
                {isFriend ? (
                  <button
                    onClick={handleRemoveFriend}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-colors text-xs font-bold shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Arkadaşsınız</span>
                  </button>
                ) : incomingRequest ? (
                  <button
                    onClick={handleAcceptFriendRequest}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{actionLoading ? 'Kabul Ediliyor...' : 'İsteği Kabul Et'}</span>
                  </button>
                ) : hasOutgoingRequest ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>İstek Gönderildi</span>
                  </span>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{actionLoading ? 'Gönderiliyor...' : 'Arkadaş Ekle'}</span>
                  </button>
                )}
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
            {workouts.map((w: any) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfilePageContent />
    </ProtectedRoute>
  )
}
