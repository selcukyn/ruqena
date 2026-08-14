export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  weekly_goal: number
  current_streak: number
  longest_streak: number
  total_xp: number
  created_at: string
  updated_at: string
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  created_at: string
}

export type WorkoutType =
  | 'Running'
  | 'Walking'
  | 'Cycling'
  | 'Gym'
  | 'Swimming'
  | 'Football'
  | 'Basketball'
  | 'Tennis'
  | 'Yoga'
  | 'Other'

export interface Workout {
  id: string
  user_id: string
  type: WorkoutType
  duration_minutes: number
  distance_km: number | null
  calories: number | null
  notes: string | null
  image_url: string | null
  workout_date: string
  created_at: string
}

export type ReactionType = '❤️' | '🔥' | '💪' | '👏'

export interface WorkoutReaction {
  id: string
  workout_id: string
  user_id: string
  reaction_type: ReactionType
  created_at: string
}

export type ChallengeType = 'count' | 'duration' | 'distance' | 'streak'

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description: string | null
  challenge_type: ChallengeType
  target_value: number
  start_date: string
  end_date: string
  created_at: string
}

export interface ChallengeMember {
  id: string
  challenge_id: string
  user_id: string
  progress: number
  joined_at: string
}

export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'WORKOUT_REACTION'
  | 'FRIEND_WORKOUT'
  | 'CHALLENGE_INVITE'
  | 'CHALLENGE_STARTED'
  | 'CHALLENGE_ENDING'
  | 'CHALLENGE_COMPLETED'
  | 'LEADERBOARD_OVERTAKEN'
  | 'ACHIEVEMENT_UNLOCKED'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  icon: string
  xp_reward: number
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
}
