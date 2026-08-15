'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Search, UserPlus, Flame, Check, X, ChevronRight, Clock, UserCheck, Sparkles } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { Profile, FriendRequest } from '@/types/database'
import { useAuth } from '@/components/providers/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function FriendsPageContent() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my_friends' | 'requests'>('my_friends')
  const [friends, setFriends] = useState<Profile[]>([])
  const [incomingRequests, setIncomingRequests] = useState<{ id: string; user: Profile }[]>([])
  const [outgoingRequestUserIds, setOutgoingRequestUserIds] = useState<string[]>([])
  
  // Search results state
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFriendsData = async () => {
    if (!user?.id) return
    try {
      const [f, reqs] = await Promise.all([
        dataService.getFriends(user.id),
        dataService.getFriendRequests(user.id),
      ])
      setFriends(f)
      setOutgoingRequestUserIds(reqs.outgoing.map((r) => r.receiver_id))

      // Transform incoming requests to format with profile data
      const incomingMapped = await Promise.all(
        reqs.incoming.map(async (r) => {
          const senderProfile = await dataService.getCurrentProfile(r.sender_id)
          return {
            id: r.id,
            user: senderProfile || {
              id: r.sender_id,
              username: 'user',
              display_name: 'Sporcu',
              avatar_url: null,
              bio: null,
              weekly_goal: 3,
              current_streak: 0,
              longest_streak: 0,
              total_xp: 0,
              created_at: r.created_at,
              updated_at: r.created_at,
            },
          }
        })
      )
      setIncomingRequests(incomingMapped)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFriendsData()
  }, [user?.id])

  // Real search across all users
  useEffect(() => {
    const cleanQuery = searchQuery.trim()
    if (!cleanQuery || !user?.id) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const results = await dataService.searchProfiles(cleanQuery, user.id)
        setSearchResults(results)
      } catch (err) {
        console.error('Search profiles error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, user?.id])

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user?.id || actionLoadingId) return
    setActionLoadingId(targetUserId)
    try {
      await dataService.sendFriendRequest(targetUserId)
      setOutgoingRequestUserIds((prev) => [...prev, targetUserId])
    } catch (err: any) {
      console.error('Error sending friend request:', err)
      alert(err.message || 'Arkadaşlık isteği gönderilemedi.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await dataService.respondToFriendRequest(requestId, 'accepted')
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
      await loadFriendsData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await dataService.respondToFriendRequest(requestId, 'rejected')
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error(err)
    }
  }

  const isSearchingActive = searchQuery.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Arkadaşların 👥</h1>
            <p className="text-xs text-slate-400">Birlikte spor yapmak her zaman daha eğlenceli!</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('my_friends')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my_friends'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Arkadaşlarım ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>İstekler</span>
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        {activeTab === 'my_friends' && (
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tüm platformda kullanıcı adı veya isim ara..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: My Friends or Search Results */}
      {activeTab === 'my_friends' && (
        <div>
          {isSearchingActive ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                <span>Arama Sonuçları ({searchResults.length})</span>
                {isSearching && <span>Aranıyor...</span>}
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 text-xs text-slate-400">
                  "{searchQuery}" ile eşleşen kullanıcı bulunamadı 🔍
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.map((foundUser) => {
                    const isAlreadyFriend = friends.some((f) => f.id === foundUser.id)
                    const hasOutgoing = outgoingRequestUserIds.includes(foundUser.id)
                    const incomingReq = incomingRequests.find((r) => r.user.id === foundUser.id)

                    return (
                      <div
                        key={foundUser.id}
                        className="glass-card rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between group"
                      >
                        <Link
                          href={`/profile/${foundUser.username}`}
                          className="flex items-center gap-3 min-w-0 flex-1 mr-3"
                        >
                          <img
                            src={foundUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={foundUser.display_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-800 group-hover:border-emerald-500 transition-colors shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">
                              {foundUser.display_name}
                            </h3>
                            <p className="text-xs text-slate-400 truncate">@{foundUser.username}</p>
                          </div>
                        </Link>

                        <div className="shrink-0">
                          {isAlreadyFriend ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Arkadaş</span>
                            </span>
                          ) : incomingReq ? (
                            <button
                              onClick={() => handleAcceptRequest(incomingReq.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all shadow-md"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Kabul Et</span>
                            </button>
                          ) : hasOutgoing ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Gönderildi</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(foundUser.id)}
                              disabled={actionLoadingId === foundUser.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:from-emerald-400 hover:to-teal-300 transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>{actionLoadingId === foundUser.id ? '...' : 'Ekle'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-8 text-center border border-slate-800 text-xs text-slate-400">
                  Henüz arkadaş eklemedin. Yukarıdaki arama kutusundan arkadaşlarını arayıp ekleyebilirsin! 👋
                </div>
              ) : (
                friends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.username}`}
                    className="glass-card glass-card-interactive rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={friend.display_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-800 group-hover:border-emerald-500 transition-colors shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">
                          {friend.display_name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">@{friend.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-orange-400 text-xs font-bold bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                        <Flame className="w-3.5 h-3.5 fill-orange-400 flame-glow" />
                        <span>{friend.current_streak}d</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {incomingRequests.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 text-xs text-slate-400">
              Bekleyen arkadaşlık isteğin bulunmuyor ✨
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div
                key={req.id}
                className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between"
              >
                <Link
                  href={`/profile/${req.user.username}`}
                  className="flex items-center gap-3 min-w-0 flex-1 mr-3 group"
                >
                  <img
                    src={req.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={req.user.display_name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-700 group-hover:border-emerald-500 transition-colors shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">
                      {req.user.display_name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">@{req.user.username}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md hover:bg-emerald-400 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Kabul Et</span>
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <FriendsPageContent />
    </ProtectedRoute>
  )
}
