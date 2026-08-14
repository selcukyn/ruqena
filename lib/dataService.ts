import { Profile, Workout, ReactionType, Challenge, AppNotification } from '@/types/database'
import { EnrichedWorkout, EnrichedChallenge, LeaderboardEntry } from '@/types/app'
import {
  SEED_PROFILES,
  SEED_WORKOUTS,
  SEED_CHALLENGES,
  SEED_NOTIFICATIONS,
  SEED_ACHIEVEMENTS,
} from './seedData'
import { calculateWorkoutXP, evaluateStreakUpdate } from './gamification'

// Local storage key constants for interactive fallback persistence
const STORAGE_KEY_WORKOUTS = 'ruqena_workouts_v1'
const STORAGE_KEY_PROFILES = 'ruqena_profiles_v1'
const STORAGE_KEY_CHALLENGES = 'ruqena_challenges_v1'
const STORAGE_KEY_NOTIFS = 'ruqena_notifications_v1'

class DataService {
  private workouts: EnrichedWorkout[] = []
  private profiles: Profile[] = []
  private challenges: EnrichedChallenge[] = []
  private notifications: AppNotification[] = []
  private currentUserId: string = 'usr_me'

  constructor() {
    if (typeof window !== 'undefined') {
      this.initFromStorage()
    } else {
      this.workouts = SEED_WORKOUTS
      this.profiles = SEED_PROFILES
      this.challenges = SEED_CHALLENGES
      this.notifications = SEED_NOTIFICATIONS
    }
  }

  private initFromStorage() {
    try {
      const storedWorkouts = localStorage.getItem(STORAGE_KEY_WORKOUTS)
      this.workouts = storedWorkouts ? JSON.parse(storedWorkouts) : SEED_WORKOUTS

      const storedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES)
      this.profiles = storedProfiles ? JSON.parse(storedProfiles) : SEED_PROFILES

      const storedChallenges = localStorage.getItem(STORAGE_KEY_CHALLENGES)
      this.challenges = storedChallenges ? JSON.parse(storedChallenges) : SEED_CHALLENGES

      const storedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS)
      this.notifications = storedNotifs ? JSON.parse(storedNotifs) : SEED_NOTIFICATIONS
    } catch {
      this.workouts = SEED_WORKOUTS
      this.profiles = SEED_PROFILES
      this.challenges = SEED_CHALLENGES
      this.notifications = SEED_NOTIFICATIONS
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_WORKOUTS, JSON.stringify(this.workouts))
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(this.profiles))
      localStorage.setItem(STORAGE_KEY_CHALLENGES, JSON.stringify(this.challenges))
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(this.notifications))
    } catch (e) {
      console.warn('Storage save failed:', e)
    }
  }

  // --- CURRENT USER ---
  getCurrentUser(): Profile {
    return this.profiles.find((p) => p.id === this.currentUserId) || this.profiles[0]
  }

  updateCurrentUserProfile(data: Partial<Profile>): Profile {
    const user = this.getCurrentUser()
    Object.assign(user, data, { updated_at: new Date().toISOString() })
    this.saveToStorage()
    return user
  }

  // --- PROFILES ---
  getAllProfiles(): Profile[] {
    return this.profiles
  }

  getProfileByUsername(username: string): Profile | undefined {
    return this.profiles.find((p) => p.username.toLowerCase() === username.toLowerCase())
  }

  // --- WORKOUTS & FEED ---
  getFeedWorkouts(): EnrichedWorkout[] {
    return [...this.workouts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  getUserWorkouts(userId: string): EnrichedWorkout[] {
    return this.workouts.filter((w) => w.user_id === userId)
  }

  createWorkout(input: {
    type: Workout['type']
    duration_minutes: number
    distance_km?: number | null
    calories?: number | null
    notes?: string | null
    image_url?: string | null
    workout_date?: string
  }): { workout: EnrichedWorkout; xpEarned: number; streakExtended: boolean } {
    const user = this.getCurrentUser()
    const xpEarned = calculateWorkoutXP(input)
    
    const lastWorkout = this.workouts.find(w => w.user_id === user.id)
    const streakResult = evaluateStreakUpdate(user.current_streak, lastWorkout ? lastWorkout.workout_date : null)

    user.current_streak = streakResult.newStreak
    if (user.current_streak > user.longest_streak) {
      user.longest_streak = user.current_streak
    }
    user.total_xp += xpEarned

    const newWorkout: EnrichedWorkout = {
      id: `wkt_${Date.now()}`,
      user_id: user.id,
      type: input.type,
      duration_minutes: Number(input.duration_minutes),
      distance_km: input.distance_km ? Number(input.distance_km) : null,
      calories: input.calories ? Number(input.calories) : null,
      notes: input.notes || null,
      image_url: input.image_url || null,
      workout_date: input.workout_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      user: { ...user },
      reactions: [
        { reaction_type: '🔥', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '❤️', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '💪', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '👏', count: 0, has_user_reacted: false, user_ids: [] },
      ],
    }

    this.workouts.unshift(newWorkout)

    // Update challenge progress if applicable
    this.challenges.forEach((chg) => {
      const member = chg.members.find((m) => m.user_id === user.id)
      if (member) {
        if (chg.challenge_type === 'count') {
          member.progress += 1
        } else if (chg.challenge_type === 'duration') {
          member.progress += newWorkout.duration_minutes
        } else if (chg.challenge_type === 'distance' && newWorkout.distance_km) {
          member.progress += newWorkout.distance_km
        }
      }
    })

    this.saveToStorage()
    return { workout: newWorkout, xpEarned, streakExtended: streakResult.isExtended }
  }

  // --- REACTIONS ---
  toggleReaction(workoutId: string, reactionType: ReactionType): EnrichedWorkout {
    const workout = this.workouts.find((w) => w.id === workoutId)
    if (!workout) throw new Error('Workout not found')

    let rxObj = workout.reactions.find((r) => r.reaction_type === reactionType)

    if (!rxObj) {
      rxObj = { reaction_type: reactionType, count: 0, has_user_reacted: false, user_ids: [] }
      workout.reactions.push(rxObj)
    }

    if (rxObj.has_user_reacted) {
      rxObj.has_user_reacted = false
      rxObj.count = Math.max(0, rxObj.count - 1)
      rxObj.user_ids = rxObj.user_ids.filter((id) => id !== this.currentUserId)
    } else {
      rxObj.has_user_reacted = true
      rxObj.count += 1
      rxObj.user_ids.push(this.currentUserId)

      // Generate notification for workout owner if not self
      if (workout.user_id !== this.currentUserId) {
        this.addNotification({
          user_id: workout.user_id,
          type: 'WORKOUT_REACTION',
          title: 'Yeni Tepki! 🔥',
          message: `${this.getCurrentUser().display_name} senin ${workout.type} antrenmanına ${reactionType} verdi.`,
          reference_id: workout.id,
        })
      }
    }

    this.saveToStorage()
    return workout
  }

  // --- CHALLENGES ---
  getChallenges(): EnrichedChallenge[] {
    return this.challenges
  }

  getChallengeById(id: string): EnrichedChallenge | undefined {
    return this.challenges.find((c) => c.id === id)
  }

  createChallenge(input: {
    title: string
    description?: string
    challenge_type: Challenge['challenge_type']
    target_value: number
    start_date: string
    end_date: string
  }): EnrichedChallenge {
    const creator = this.getCurrentUser()
    const newChg: EnrichedChallenge = {
      id: `chg_${Date.now()}`,
      creator_id: creator.id,
      title: input.title,
      description: input.description || null,
      challenge_type: input.challenge_type,
      target_value: Number(input.target_value),
      start_date: input.start_date,
      end_date: input.end_date,
      created_at: new Date().toISOString(),
      days_remaining: Math.max(
        0,
        Math.ceil((new Date(input.end_date).getTime() - new Date().getTime()) / 86400000)
      ),
      creator,
      user_progress: 0,
      is_user_member: true,
      members: [
        {
          id: `cm_${Date.now()}`,
          challenge_id: `chg_${Date.now()}`,
          user_id: creator.id,
          progress: 0,
          joined_at: new Date().toISOString(),
          user: creator,
        },
      ],
    }

    this.challenges.unshift(newChg)
    this.saveToStorage()
    return newChg
  }

  joinChallenge(challengeId: string): EnrichedChallenge {
    const chg = this.getChallengeById(challengeId)
    if (!chg) throw new Error('Challenge not found')

    const user = this.getCurrentUser()
    if (!chg.members.some((m) => m.user_id === user.id)) {
      chg.members.push({
        id: `cm_${Date.now()}`,
        challenge_id: challengeId,
        user_id: user.id,
        progress: 0,
        joined_at: new Date().toISOString(),
        user,
      })
      chg.is_user_member = true
    }

    this.saveToStorage()
    return chg
  }

  // --- LEADERBOARDS ---
  getLeaderboard(period: 'weekly' | 'monthly' | 'alltime'): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = this.profiles.map((user) => {
      const userWkts = this.workouts.filter((w) => w.user_id === user.id)
      const count = userWkts.length
      return {
        rank: 0,
        user,
        metric_value: count,
        metric_label: `${count} Antrenman`,
        streak: user.current_streak,
      }
    })

    entries.sort((a, b) => b.metric_value - a.metric_value || b.streak - a.streak)
    entries.forEach((e, idx) => {
      e.rank = idx + 1
    })

    return entries
  }

  // --- NOTIFICATIONS ---
  getNotifications(): AppNotification[] {
    return this.notifications
  }

  addNotification(notif: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}`,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    this.notifications.unshift(newNotif)
    this.saveToStorage()
    return newNotif
  }

  markNotificationAsRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id)
    if (notif) notif.is_read = true
    this.saveToStorage()
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach((n) => (n.is_read = true))
    this.saveToStorage()
  }

  getAchievements() {
    return SEED_ACHIEVEMENTS
  }
}

export const dataService = new DataService()
