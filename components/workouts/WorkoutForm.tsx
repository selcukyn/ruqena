'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutType } from '@/types/database'
import { dataService } from '@/lib/dataService'
import confetti from 'canvas-confetti'
import { Flame, Clock, MapPin, Zap, Camera, Calendar, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

const WORKOUT_TYPES: { type: WorkoutType; label: string; icon: string; bg: string }[] = [
  { type: 'Running', label: 'Koşu', icon: '🏃‍♂️', bg: 'from-amber-500/20 to-orange-500/20 border-orange-500/40 text-orange-400' },
  { type: 'Walking', label: 'Yürüyüş', icon: '🚶‍♂️', bg: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400' },
  { type: 'Cycling', label: 'Bisiklet', icon: '🚴‍♂️', bg: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400' },
  { type: 'Gym', label: 'Fitness / Gym', icon: '🏋️‍♂️', bg: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-400' },
  { type: 'Swimming', label: 'Yüzme', icon: '🏊‍♂️', bg: 'from-blue-500/20 to-sky-500/20 border-blue-500/40 text-blue-400' },
  { type: 'Football', label: 'Futbol', icon: '⚽', bg: 'from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-400' },
  { type: 'Basketball', label: 'Basketbol', icon: '🏀', bg: 'from-amber-600/20 to-orange-600/20 border-amber-500/40 text-amber-400' },
  { type: 'Tennis', label: 'Tenis', icon: '🎾', bg: 'from-lime-500/20 to-emerald-500/20 border-lime-500/40 text-lime-400' },
  { type: 'Yoga', label: 'Yoga & Pilates', icon: '🧘‍♀️', bg: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-400' },
  { type: 'Other', label: 'Diğer Sporlar', icon: '⚡', bg: 'from-slate-500/20 to-slate-700/20 border-slate-500/40 text-slate-300' },
]

const SAMPLE_PHOTOS = [
  { label: 'Koşu Yolu', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Salonda Spor', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80' },
  { label: 'Bisiklet Rotası', url: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80' },
  { label: 'Yoga Akışı', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80' },
]

export function WorkoutForm() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<WorkoutType>('Running')
  const [duration, setDuration] = useState<number>(35)
  const [distance, setDistance] = useState<string>('5.0')
  const [calories, setCalories] = useState<string>('320')
  const [notes, setNotes] = useState<string>('')
  const [selectedPhoto, setSelectedPhoto] = useState<string>(SAMPLE_PHOTOS[0].url)
  const [workoutDate, setWorkoutDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [privacy, setPrivacy] = useState<'friends' | 'private'>('friends')

  const [loading, setLoading] = useState(false)
  const [successResult, setSuccessResult] = useState<{ xpEarned: number; streakExtended: boolean } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = dataService.createWorkout({
        type: selectedType,
        duration_minutes: Number(duration),
        distance_km: distance ? parseFloat(distance) : null,
        calories: calories ? parseInt(calories) : null,
        notes: notes.trim() || null,
        image_url: selectedPhoto || null,
        workout_date: workoutDate,
      })

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f97316', '#3b82f6'],
      })

      setSuccessResult({ xpEarned: result.xpEarned, streakExtended: result.streakExtended })
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (successResult) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center max-w-lg mx-auto space-y-6 my-8 border border-emerald-500/30">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Antrenman Kaydedildi! 🔥</h2>
          <p className="text-xs text-slate-400 mt-1">Harika bir performans sergiledin, tebrikler!</p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 font-extrabold text-lg block">+{successResult.xpEarned} XP</span>
            <span className="text-[10px] text-slate-400">Kazanılan Puan</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center justify-center gap-1 text-orange-400 font-extrabold text-lg">
              <Flame className="w-5 h-5 fill-orange-400" />
              <span>{dataService.getCurrentUser().current_streak} Gün</span>
            </div>
            <span className="text-[10px] text-slate-400">Aktif Seri</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/home')}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-105 transition-transform"
        >
          <span>Ana Sayfaya Dön</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* 1. Workout Type Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Antrenman Türü Seç
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {WORKOUT_TYPES.map((wt) => {
            const isSelected = selectedType === wt.type
            return (
              <button
                key={wt.type}
                type="button"
                onClick={() => setSelectedType(wt.type)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between min-h-[76px] transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-br ${wt.bg} font-bold shadow-lg border-2 scale-[1.02]`
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="text-xl">{wt.icon}</span>
                <span className="text-xs tracking-tight">{wt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Duration & Distance & Calories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Duration */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Süre (Dakika) *</span>
          </label>
          <input
            type="number"
            required
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
          />
          {/* Quick preset buttons */}
          <div className="flex gap-1.5 mt-2">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDuration(mins)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white hover:border-emerald-500/50"
              >
                +{mins}dk
              </button>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>Mesafe (KM)</span>
          </label>
          <input
            type="number"
            step="0.1"
            min={0}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Opsiyonel"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Calories */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Kalori (Kcal)</span>
          </label>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Opsiyonel"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 3. Date & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Tarih</span>
          </label>
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notlar & Duygular</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Örn: Harika bir tempoydu, kişisel rekorumu kırdım! 🔥"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 4. Photo Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Fotoğraf Ekle</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SAMPLE_PHOTOS.map((photo) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => setSelectedPhoto(photo.url)}
              className={`relative rounded-xl overflow-hidden h-20 border-2 transition-all ${
                selectedPhoto === photo.url
                  ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 right-1 bg-black/70 text-[9px] text-white py-0.5 px-1 rounded text-center truncate">
                {photo.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Privacy Visibility Setting */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">Bu antrenmanı kimler görebilir?</span>
            <span className="text-[11px] text-slate-400">Varsayılan olarak sadece onaylı arkadaşların görebilir.</span>
          </div>
        </div>
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as 'friends' | 'private')}
          className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="friends">Arkadaşlarım</option>
          <option value="private">Sadece Ben</option>
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <Flame className="w-5 h-5 fill-slate-950" />
        <span>{loading ? 'Kaydediliyor...' : 'Antrenmanı Kaydet 🔥'}</span>
      </button>
    </form>
  )
}
