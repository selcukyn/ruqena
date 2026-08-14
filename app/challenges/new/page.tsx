'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Calendar, Target, ArrowRight } from 'lucide-react'
import { dataService } from '@/lib/dataService'
import { ChallengeType } from '@/types/database'

const CHALLENGE_TYPES: { type: ChallengeType; label: string; icon: string; unit: string }[] = [
  { type: 'count', label: 'Antrenman Sayısı', icon: '🏋️‍♂️', unit: 'Antrenman' },
  { type: 'duration', label: 'Toplam Süre', icon: '⏱️', unit: 'Dakika' },
  { type: 'distance', label: 'Toplam Mesafe', icon: '🏃‍♂️', unit: 'KM' },
  { type: 'streak', label: 'Antrenman Serisi', icon: '🔥', unit: 'Gün' },
]

export default function NewChallengePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ChallengeType>('count')
  const [targetValue, setTargetValue] = useState<number>(20)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  )

  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newChg = dataService.createChallenge({
        title,
        description,
        challenge_type: type,
        target_value: Number(targetValue),
        start_date: startDate,
        end_date: endDate,
      })
      setLoading(false)
      router.push(`/challenges/${newChg.id}`)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const selectedUnit = CHALLENGE_TYPES.find((t) => t.type === type)?.unit || ''

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
          <Trophy className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Yeni Challenge Başlat ⚔️</h1>
          <p className="text-xs text-slate-400">Arkadaşlarınla hedef koy, yarışı başlat!</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Challenge Başlığı *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: 30 Günde 20 Antrenman 🔥"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Açıklama & Kurallar</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Örn: Ay sonuna kadar disiplinini koru, 20 antrenmanı tamamla!"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Challenge Type Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Hedef Türü</label>
          <div className="grid grid-cols-2 gap-2.5">
            {CHALLENGE_TYPES.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => setType(ct.type)}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  type === ct.type
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">{ct.icon}</span>
                <span className="text-xs">{ct.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Value */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Hedef Değeri ({selectedUnit}) *</span>
          </label>
          <input
            type="number"
            required
            min={1}
            value={targetValue}
            onChange={(e) => setTargetValue(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white font-bold text-base focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Başlangıç Tarihi</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>Bitiş Tarihi</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <span>{loading ? 'Oluşturuluyor...' : 'Challenge Oluştur ve Yarışı Başlat 🚀'}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  )
}
