import { Workout, Profile } from '@/types/database'

export interface XPResult {
  added_xp: number
  new_total_xp: number
  unlocked_badges: string[]
  level: number
  message: string
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1
}

export function calculateWorkoutXP(workout: Partial<Workout>): number {
  let xp = 10 // Base workout creation XP

  // Duration bonus
  if (workout.duration_minutes && workout.duration_minutes >= 45) {
    xp += 5
  }

  // Distance bonus
  if (workout.distance_km && workout.distance_km >= 5) {
    xp += 5
  }

  return xp
}

export function evaluateStreakUpdate(
  currentStreak: number,
  lastWorkoutDateStr: string | null
): { newStreak: number; isExtended: boolean } {
  if (!lastWorkoutDateStr) {
    return { newStreak: 1, isExtended: true }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastDate = new Date(lastWorkoutDateStr)
  lastDate.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - lastDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

  if (diffDays === 0) {
    // Same day workout: maintain streak without incrementing active days count twice
    return { newStreak: currentStreak, isExtended: false }
  } else if (diffDays === 1) {
    // Consecutive day
    return { newStreak: currentStreak + 1, isExtended: true }
  } else {
    // Streak broken
    return { newStreak: 1, isExtended: true }
  }
}

export function getMotivationalCopy(stats: { weeklyCount: number; weeklyGoal: number; streak: number }): string {
  if (stats.weeklyCount >= stats.weeklyGoal) {
    return 'Haftalık hedefini tamamladın! Muhteşemsin 🔥🏆'
  }
  const remaining = stats.weeklyGoal - stats.weeklyCount
  if (remaining === 1) {
    return 'Hedefe ulaşmana sadece 1 antrenman kaldı! ⚡️'
  }
  return `Bu hafta ${stats.weeklyCount} / ${stats.weeklyGoal} antrenman. Harika gidiyorsun! 💪`
}
