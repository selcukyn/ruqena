'use client'

import { useState } from 'react'
import { ReactionType } from '@/types/database'
import { EnrichedReaction } from '@/types/app'
import { dataService } from '@/lib/dataService'

interface ReactionBarProps {
  workoutId: string
  initialReactions: EnrichedReaction[]
}

const ALL_REACTIONS: ReactionType[] = ['🔥', '💪', '❤️', '👏']

export function ReactionBar({ workoutId, initialReactions }: ReactionBarProps) {
  const [reactions, setReactions] = useState<EnrichedReaction[]>(initialReactions)

  const handleToggle = (type: ReactionType) => {
    // Optimistic UI update
    setReactions((prev) => {
      return prev.map((r) => {
        if (r.reaction_type === type) {
          const hasReacted = !r.has_user_reacted
          return {
            ...r,
            has_user_reacted: hasReacted,
            count: hasReacted ? r.count + 1 : Math.max(0, r.count - 1),
          }
        }
        return r
      })
    })

    // Execute server / dataService call
    try {
      dataService.toggleReaction(workoutId, type)
    } catch (err) {
      console.error('Reaction toggle failed:', err)
    }
  }

  return (
    <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
      {ALL_REACTIONS.map((emoji) => {
        const rx = reactions.find((r) => r.reaction_type === emoji) || {
          reaction_type: emoji,
          count: 0,
          has_user_reacted: false,
          user_ids: [],
        }

        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-90 ${
              rx.has_user_reacted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <span className="text-sm">{emoji}</span>
            {rx.count > 0 && <span>{rx.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
