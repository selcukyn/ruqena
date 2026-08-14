'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EnrichedWorkout } from '@/types/app'
import { ReactionBar } from './ReactionBar'
import { Clock, MapPin, Zap, Calendar, Flame } from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  Running: '🏃‍♂️',
  Walking: '🚶‍♂️',
  Cycling: '🚴‍♂️',
  Gym: '🏋️‍♂️',
  Swimming: '🏊‍♂️',
  Football: '⚽',
  Basketball: '🏀',
  Tennis: '🎾',
  Yoga: '🧘‍♀️',
  Other: '⚡',
}

const TYPE_TRANSLATIONS: Record<string, string> = {
  Running: 'Koşu',
  Walking: 'Yürüyüş',
  Cycling: 'Bisiklet',
  Gym: 'Fitness / Vücut Geliştirme',
  Swimming: 'Yüzme',
  Football: 'Futbol',
  Basketball: 'Basketbol',
  Tennis: 'Tenis',
  Yoga: 'Yoga & Pilates',
  Other: 'Antrenman',
}

interface WorkoutCardProps {
  workout: EnrichedWorkout
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const [showImageModal, setShowImageModal] = useState(false)
  const icon = TYPE_ICONS[workout.type] || '⚡'
  const title = TYPE_TRANSLATIONS[workout.type] || workout.type

  // Format relative timestamp
  const dateFormatted = new Date(workout.created_at).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="glass-card glass-card-interactive rounded-3xl p-4 sm:p-5 mb-4 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${workout.user.username}`} className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src={workout.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={workout.user.display_name}
              className="w-11 h-11 rounded-full object-cover border-2 border-slate-800 group-hover:border-emerald-500 transition-colors"
            />
            {workout.user.current_streak >= 3 && (
              <div className="absolute -bottom-1 -right-1 bg-[#090d16] p-0.5 rounded-full">
                <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400 flame-glow" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                {workout.user.display_name}
              </h3>
              <span className="text-xs text-slate-500">@{workout.user.username}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <span>{icon}</span>
                <span>{title}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{dateFormatted}</span>
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Workout Notes */}
      {workout.notes && (
        <p className="text-sm text-slate-200 font-medium mb-3 leading-relaxed">
          {workout.notes}
        </p>
      )}

      {/* Workout Image Preview */}
      {workout.image_url && (
        <div className="relative rounded-2xl overflow-hidden mb-3 border border-slate-800 max-h-72 group">
          <img
            src={workout.image_url}
            alt="Workout photo"
            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
            onClick={() => setShowImageModal(true)}
          />
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>{workout.duration_minutes} dk</span>
        </div>

        {workout.distance_km && (
          <>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>{workout.distance_km} km</span>
            </div>
          </>
        )}

        {workout.calories && (
          <>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{workout.calories} kcal</span>
            </div>
          </>
        )}
      </div>

      {/* 1-Tap Reaction Bar */}
      <ReactionBar workoutId={workout.id} initialReactions={workout.reactions} />

      {/* Image Lightbox Modal */}
      {showImageModal && workout.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden border border-slate-700">
            <img src={workout.image_url} alt="Workout enlarged" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
