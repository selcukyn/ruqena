'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Search, UserPlus, Flame, Check, X, ChevronRight } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { Profile } from '@/types/database'

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my_friends' | 'requests'>('my_friends')
  const allProfiles = dataService.getAllProfiles()
  const me = dataService.getCurrentUser()

  // Filter friends (excluding current user)
  const myFriends = allProfiles.filter((p) => p.id !== me.id)

  const filteredFriends = myFriends.filter(
    (p) =>
      p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Demo requests
  const [requests, setRequests] = useState([
    {
      id: 'req_1',
      user: {
        id: 'usr_elof',
        username: 'elif_fit',
        display_name: 'Elif Şahin',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        current_streak: 6,
      },
    },
  ])

  const handleAcceptRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRejectRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

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
            Arkadaşlarım ({myFriends.length})
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
            {requests.length > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {requests.length}
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
              placeholder="Kullanıcı adı veya isim ara..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* TAB 1: My Friends */}
      {activeTab === 'my_friends' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredFriends.map((friend) => (
            <Link
              key={friend.id}
              href={`/profile/${friend.username}`}
              className="glass-card glass-card-interactive rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={friend.display_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-800 group-hover:border-emerald-500 transition-colors"
                />
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {friend.display_name}
                  </h3>
                  <p className="text-xs text-slate-400">@{friend.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-orange-400 text-xs font-bold bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                  <Flame className="w-3.5 h-3.5 fill-orange-400 flame-glow" />
                  <span>{friend.current_streak}d</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* TAB 2: Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 text-xs text-slate-400">
              Bekleyen arkadaşlık isteğin bulunmuyor ✨
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.user.avatar_url}
                    alt={req.user.display_name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">{req.user.display_name}</h3>
                    <p className="text-xs text-slate-400">@{req.user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
