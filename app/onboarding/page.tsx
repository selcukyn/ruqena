'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Sparkles, User, Target, Users } from 'lucide-react'
import { dataService } from '@/lib/dataService'

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
]

import { useAuth } from '@/components/providers/AuthProvider'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)

  const [displayName, setDisplayName] = useState('Selçuk Yılmaz')
  const [username, setUsername] = useState('selcuk')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0])
  const [weeklyGoal, setWeeklyGoal] = useState(4)

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      const userId = user?.id || 'usr_me'
      // Save profile updates
      await dataService.updateCurrentUserProfile(userId, {
        display_name: displayName,
        username,
        avatar_url: selectedAvatar,
        weekly_goal: weeklyGoal,
      })
      router.push('/home')
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-lg mx-auto py-6">
      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? 'w-8 bg-emerald-400'
                : s < step
                ? 'w-2 bg-emerald-500/40'
                : 'w-2 bg-slate-800'
            }`}
          />
        ))}
      </div>

      <div className="bg-[#121826]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* STEP 1: Name */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <User className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Adın ne? 👋</h2>
              <p className="text-xs text-slate-400 mt-1">Arkadaşlarının seni nasıl tanımasını istersin?</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Görünen Adın</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ahmet Kaya"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Avatar & Username */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <Sparkles className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Nasıl görünmek istersin? ✨</h2>
              <p className="text-xs text-slate-400 mt-1">Kullanıcı adını ve profil resmini seç.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kullanıcı Adı (@)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ahmet_run"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Profil Fotoğrafı Seç</label>
              <div className="flex items-center justify-around gap-2">
                {AVATAR_OPTIONS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                      selectedAvatar === url
                        ? 'border-emerald-400 scale-110 shadow-lg shadow-emerald-500/30'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Weekly Goal */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <Target className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Haftalık hedefin ne? 🎯</h2>
              <p className="text-xs text-slate-400 mt-1">Haftada kaç gün antrenman yapmak istiyorsun?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWeeklyGoal(count)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    weeklyGoal === count
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl font-black block">{count}</span>
                  <span className="text-xs text-slate-400 font-normal">Antrenman / Hafta</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Friends */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <Users className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Arkadaşlarını bul 👥</h2>
              <p className="text-xs text-slate-400 mt-1">RUQENA arkadaşlarınla güzel. Şimdilik bu adımı geçebilirsin!</p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 text-center space-y-2">
              <p className="text-xs text-slate-300 font-medium">Ahmet, Zeynep ve Mehmet seni bekliyor!</p>
              <div className="flex justify-center -space-x-2">
                {AVATAR_OPTIONS.slice(1, 4).map((url, i) => (
                  <img key={i} src={url} className="w-9 h-9 rounded-full border-2 border-[#121826] object-cover" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Button */}
        <button
          onClick={handleNext}
          className="w-full mt-8 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>{step === 4 ? 'RUQENA’ya Başla 🔥' : 'Devam Et'}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  )
}
