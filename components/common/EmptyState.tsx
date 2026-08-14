import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="glass-card rounded-3xl p-8 text-center max-w-md mx-auto my-6 border border-slate-800">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 stroke-[2]" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
