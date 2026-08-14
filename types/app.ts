import { Profile, Workout, ReactionType, Challenge, ChallengeMember } from './database'

export interface EnrichedReaction {
  reaction_type: ReactionType
  count: number
  has_user_reacted: boolean
  user_ids: string[]
}

export interface EnrichedWorkout extends Workout {
  user: Profile
  reactions: EnrichedReaction[]
}

export interface EnrichedChallengeMember extends ChallengeMember {
  user: Profile
}

export interface EnrichedChallenge extends Challenge {
  creator: Profile
  members: EnrichedChallengeMember[]
  user_progress?: number
  is_user_member?: boolean
  days_remaining: number
}

export interface UserStats {
  weekly_count: number
  weekly_goal: number
  current_streak: number
  longest_streak: number
  total_xp: number
  total_workouts: number
  total_duration_minutes: number
  total_distance_km: number
}

export interface LeaderboardEntry {
  rank: number
  user: Profile
  metric_value: number
  metric_label: string
  streak: number
}
