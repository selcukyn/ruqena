'use client'

import { WorkoutForm } from '@/components/workouts/WorkoutForm'
import { Activity } from 'lucide-react'

export default function NewWorkoutPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
          <Activity className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Yeni Antrenman Ekle ⚡️</h1>
          <p className="text-xs text-slate-400">Bugünkü harika performansını arkadaşlarınla paylaş!</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-800/80 shadow-2xl">
        <WorkoutForm />
      </div>
    </div>
  )
}
