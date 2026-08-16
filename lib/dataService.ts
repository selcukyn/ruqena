import { Profile, Workout, ReactionType, Challenge, AppNotification, FriendRequest, Achievement, UserAchievement } from '@/types/database'
import { EnrichedWorkout, EnrichedChallenge, LeaderboardEntry } from '@/types/app'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import {
  SEED_PROFILES,
  SEED_WORKOUTS,
  SEED_CHALLENGES,
  SEED_NOTIFICATIONS,
  SEED_ACHIEVEMENTS,
} from './seedData'
import { calculateWorkoutXP, evaluateStreakUpdate } from './gamification'

class DataService {
  private localWorkouts: EnrichedWorkout[] = SEED_WORKOUTS
  private localProfiles: Profile[] = SEED_PROFILES
  private localChallenges: EnrichedChallenge[] = SEED_CHALLENGES
  private localNotifications: AppNotification[] = SEED_NOTIFICATIONS
  private localCurrentUserId: string = 'usr_me'

  // --- WEB PUSH HELPER ---
  private async triggerPushNotification(receiverId: string, title: string, message: string, url?: string): Promise<void> {
    try {
      if (!isSupabaseConfigured || !supabase) return
      const session = (await supabase.auth.getSession()).data?.session
      if (!session) return

      // Best-effort push: do not block the main execution flow
      fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiverId,
          title,
          message,
          url
        })
      }).catch(err => console.error('Push notification failed:', err))
    } catch (err) {
      console.error('Error triggering push notification:', err)
    }
  }

  // --- PROFILES ---
  async getCurrentProfile(userId?: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const targetId = userId || (await supabase.auth.getUser()).data.user?.id
      if (!targetId) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    }

    const targetId = userId || this.localCurrentUserId
    return this.localProfiles.find((p) => p.id === targetId) || this.localProfiles[0]
  }

  async updateCurrentUserProfile(userId: string, data: Partial<Profile>): Promise<Profile> {
    // Sanitize: strip out gamification fields so client doesn't attempt direct update
    const { total_xp, current_streak, longest_streak, id, ...allowedUpdates } = data as any

    if (isSupabaseConfigured && supabase) {
      const currentAuthUser = (await supabase.auth.getUser()).data.user
      const effectiveUserId = (currentAuthUser?.id && currentAuthUser.id !== 'usr_me') ? currentAuthUser.id : userId

      if (!effectiveUserId || effectiveUserId === 'usr_me') {
        throw new Error('User is not authenticated')
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', effectiveUserId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated
    }

    const user = this.localProfiles.find((p) => p.id === userId) || this.localProfiles[0]
    Object.assign(user, allowedUpdates, { updated_at: new Date().toISOString() })
    return user
  }

  async getAllProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return []

      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw new Error(error.message)
      return data || []
    }
    return this.localProfiles
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data
    }
    return this.localProfiles.find((p) => p.username.toLowerCase() === username.toLowerCase()) || null
  }

  async searchProfiles(query: string, currentUserId?: string): Promise<Profile[]> {
    const cleanQuery = query.trim().toLowerCase()
    if (!cleanQuery) return []

    if (isSupabaseConfigured && supabase) {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return []

      let queryBuilder = supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)

      if (currentUserId) {
        queryBuilder = queryBuilder.neq('id', currentUserId)
      }

      const { data, error } = await queryBuilder.limit(20)
      if (error) throw new Error(error.message)
      return data || []
    }

    return this.localProfiles.filter(
      (p) =>
        (!currentUserId || p.id !== currentUserId) &&
        (p.username.toLowerCase().includes(cleanQuery) ||
          p.display_name.toLowerCase().includes(cleanQuery))
    )
  }

  // --- WORKOUTS & FEED ---
  async getFeedWorkouts(): Promise<EnrichedWorkout[]> {
    if (isSupabaseConfigured && supabase) {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        return []
      }

      const { data, error } = await supabase
        .from('workouts')
        .select('*, user:profiles!workouts_user_id_fkey(*), reactions:workout_reactions(*)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching feed workouts:', error)
        console.error(
          'Feed error details:',
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        )
        return []
      }

      const currentAuthUser = (await supabase.auth.getUser()).data.user
      const currentUserId = currentAuthUser?.id || ''

      // Transform DB relations into EnrichedWorkout format
      return (data || []).map((w: any) => {
        const rawReactions = w.reactions || []
        const groupedMap: Record<string, { count: number; has_user_reacted: boolean; user_ids: string[] }> = {
          '🔥': { count: 0, has_user_reacted: false, user_ids: [] },
          '❤️': { count: 0, has_user_reacted: false, user_ids: [] },
          '💪': { count: 0, has_user_reacted: false, user_ids: [] },
          '👏': { count: 0, has_user_reacted: false, user_ids: [] },
        }

        rawReactions.forEach((rx: any) => {
          if (groupedMap[rx.reaction_type]) {
            groupedMap[rx.reaction_type].count += 1
            groupedMap[rx.reaction_type].user_ids.push(rx.user_id)
            if (rx.user_id === currentUserId) {
              groupedMap[rx.reaction_type].has_user_reacted = true
            }
          }
        })

        return {
          ...w,
          user: w.user,
          reactions: Object.entries(groupedMap).map(([type, val]) => ({
            reaction_type: type as ReactionType,
            ...val,
          })),
        }
      })
    }

    return [...this.localWorkouts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  async getUserWorkouts(userId: string): Promise<EnrichedWorkout[]> {
    if (isSupabaseConfigured && supabase) {
      const feed = await this.getFeedWorkouts()
      return feed.filter((w) => w.user_id === userId)
    }
    return this.localWorkouts.filter((w) => w.user_id === userId)
  }

  async createWorkout(
    userId: string,
    input: {
      type: Workout['type']
      duration_minutes: number
      distance_km?: number | null
      calories?: number | null
      notes?: string | null
      image_url?: string | null
      workout_date?: string
      visibility?: 'friends' | 'private'
    }
  ): Promise<{ workout: EnrichedWorkout; xpEarned: number; streakExtended: boolean }> {
    const xpEarned = calculateWorkoutXP(input)

    if (isSupabaseConfigured && supabase) {
      const currentAuthUser = (await supabase.auth.getUser()).data.user
      const effectiveUserId = (currentAuthUser?.id && currentAuthUser.id !== 'usr_me') ? currentAuthUser.id : userId

      const { data: inserted, error } = await supabase
        .from('workouts')
        .insert({
          user_id: effectiveUserId,
          type: input.type,
          duration_minutes: Number(input.duration_minutes),
          distance_km: input.distance_km ? Number(input.distance_km) : null,
          calories: input.calories ? Number(input.calories) : null,
          notes: input.notes || null,
          image_url: input.image_url || null,
          workout_date: input.workout_date || new Date().toISOString().split('T')[0],
          visibility: input.visibility || 'friends',
        })
        .select('*, user:profiles!workouts_user_id_fkey(*)')
        .single()

      if (error) throw new Error(error.message)

      const enriched: EnrichedWorkout = {
        ...inserted,
        user: inserted.user,
        reactions: [
          { reaction_type: '🔥', count: 0, has_user_reacted: false, user_ids: [] },
          { reaction_type: '❤️', count: 0, has_user_reacted: false, user_ids: [] },
          { reaction_type: '💪', count: 0, has_user_reacted: false, user_ids: [] },
          { reaction_type: '👏', count: 0, has_user_reacted: false, user_ids: [] },
        ],
      }

      return { workout: enriched, xpEarned, streakExtended: false }
    }

    const user = this.localProfiles.find((p) => p.id === userId) || this.localProfiles[0]
    const lastWorkout = this.localWorkouts.find((w) => w.user_id === user.id)
    const streakResult = evaluateStreakUpdate(
      user.current_streak,
      lastWorkout ? lastWorkout.workout_date : null
    )

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
      visibility: input.visibility || 'friends',
      created_at: new Date().toISOString(),
      user: { ...user },
      reactions: [
        { reaction_type: '🔥', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '❤️', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '💪', count: 0, has_user_reacted: false, user_ids: [] },
        { reaction_type: '👏', count: 0, has_user_reacted: false, user_ids: [] },
      ],
    }

    this.localWorkouts.unshift(newWorkout)
    return { workout: newWorkout, xpEarned, streakExtended: streakResult.isExtended }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
      if (error) throw new Error(error.message)
      return
    }

    this.localWorkouts = this.localWorkouts.filter((w) => w.id !== workoutId)
  }

  // --- REACTIONS ---
  async toggleReaction(userId: string, workoutId: string, reactionType: ReactionType): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('workout_reactions')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType)
        .maybeSingle()

      if (existing) {
        await supabase.from('workout_reactions').delete().eq('id', existing.id)
      } else {
        await supabase.from('workout_reactions').insert({
          workout_id: workoutId,
          user_id: userId,
          reaction_type: reactionType,
        })
      }
      return
    }

    const workout = this.localWorkouts.find((w) => w.id === workoutId)
    if (!workout) return

    let rxObj = workout.reactions.find((r) => r.reaction_type === reactionType)
    if (!rxObj) {
      rxObj = { reaction_type: reactionType, count: 0, has_user_reacted: false, user_ids: [] }
      workout.reactions.push(rxObj)
    }

    if (rxObj.has_user_reacted) {
      rxObj.has_user_reacted = false
      rxObj.count = Math.max(0, rxObj.count - 1)
      rxObj.user_ids = rxObj.user_ids.filter((id) => id !== userId)
    } else {
      rxObj.has_user_reacted = true
      rxObj.count += 1
      rxObj.user_ids.push(userId)
    }
  }

  // --- FRIEND SYSTEM (RPC ONLY) ---
  async sendFriendRequest(receiverId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('send_friend_request', {
        p_receiver_id: receiverId,
      })
      if (error) throw new Error(error.message)
      
      // Trigger Web Push Notification
      this.triggerPushNotification(
        receiverId,
        'Yeni Arkadaşlık İsteği 👥',
        'Sana bir arkadaşlık isteği gönderildi.',
        '/friends'
      )
      return
    }
  }

  async respondToFriendRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('respond_to_friend_request', {
        p_request_id: requestId,
        p_status: status,
      })
      if (error) throw new Error(error.message)
      return
    }
  }

  async getFriends(userId: string): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('friends')
        .select('*, friend:profiles!friends_friend_id_fkey(*)')
        .eq('user_id', userId)

      if (error) throw new Error(error.message)
      return (data || []).map((f: any) => f.friend)
    }
    return this.localProfiles.filter((p) => p.id !== userId)
  }

  async removeFriend(friendId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId })
      if (error) throw new Error(error.message)
    }
  }

  async getFriendRequests(userId: string): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

      if (error) throw new Error(error.message)

      const incoming = (data || []).filter((r: any) => r.receiver_id === userId && r.status === 'pending')
      const outgoing = (data || []).filter((r: any) => r.sender_id === userId && r.status === 'pending')

      return { incoming, outgoing }
    }
    return { incoming: [], outgoing: [] }
  }

  // --- CHALLENGES & RPC JOIN ---
  async getChallenges(): Promise<EnrichedChallenge[]> {
    if (isSupabaseConfigured && supabase) {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        return []
      }

      const { data, error } = await supabase
        .from('challenges')
        .select('*, creator:profiles!challenges_creator_id_fkey(*), members:challenge_members(*, user:profiles(*))')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching challenges:', error)
        console.error(
          'Challenges error details:',
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        )
        return []
      }

      const currentAuthUser = (await supabase.auth.getUser()).data.user
      const currentUserId = currentAuthUser?.id || ''

      return (data || []).map((chg: any) => {
        const membersList = chg.members || []
        const userMemberObj = membersList.find((m: any) => m.user_id === currentUserId)
        return {
          ...chg,
          creator: chg.creator,
          members: membersList,
          user_progress: userMemberObj ? Number(userMemberObj.progress) : 0,
          is_user_member: Boolean(userMemberObj),
          days_remaining: Math.max(
            0,
            Math.ceil((new Date(chg.end_date).getTime() - new Date().getTime()) / 86400000)
          ),
        }
      })
    }

    return this.localChallenges
  }

  async getChallengeById(id: string): Promise<EnrichedChallenge | null> {
    if (isSupabaseConfigured && supabase) {
      const challenges = await this.getChallenges()
      return challenges.find((c) => c.id === id) || null
    }
    return this.localChallenges.find((c) => c.id === id) || null
  }

  async createChallenge(
    creatorId: string,
    input: {
      title: string
      description?: string
      challenge_type: Challenge['challenge_type']
      target_value: number
      start_date: string
      end_date: string
    }
  ): Promise<EnrichedChallenge> {
    if (isSupabaseConfigured && supabase) {
      const currentAuthUser = (await supabase.auth.getUser()).data.user
      const effectiveCreatorId = (currentAuthUser?.id && currentAuthUser.id !== 'usr_me') ? currentAuthUser.id : creatorId

      const { data, error } = await supabase
        .from('challenges')
        .insert({
          creator_id: effectiveCreatorId,
          title: input.title,
          description: input.description || null,
          challenge_type: input.challenge_type,
          target_value: Number(input.target_value),
          start_date: input.start_date,
          end_date: input.end_date,
        })
        .select('*, creator:profiles!challenges_creator_id_fkey(*)')
        .single()

      if (error) throw new Error(error.message)

      // Creator automatically joins as member
      await this.joinChallenge(data.id)

      return {
        ...data,
        creator: data.creator,
        members: [],
        days_remaining: Math.max(
          0,
          Math.ceil((new Date(input.end_date).getTime() - new Date().getTime()) / 86400000)
        ),
      }
    }

    const creator = this.localProfiles.find((p) => p.id === creatorId) || this.localProfiles[0]
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

    this.localChallenges.unshift(newChg)
    return newChg
  }

  async joinChallenge(challengeId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('join_challenge', {
        p_challenge_id: challengeId,
      })
      if (error) throw new Error(error.message)
      return
    }

    const chg = this.localChallenges.find((c) => c.id === challengeId)
    if (chg && !chg.members.some((m) => m.user_id === 'usr_me')) {
      chg.members.push({
        id: `cm_${Date.now()}`,
        challenge_id: challengeId,
        user_id: 'usr_me',
        progress: 0,
        joined_at: new Date().toISOString(),
        user: this.localProfiles[0],
      })
      chg.is_user_member = true
    }
  }

  async inviteToChallenge(challengeId: string, inviteeId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('invite_to_challenge', {
        p_challenge_id: challengeId,
        p_invitee_id: inviteeId,
      })
      if (error) throw new Error(error.message)

      // Trigger Web Push Notification
      this.triggerPushNotification(
        inviteeId,
        'Yeni Challenge Daveti ⚔️',
        "Bir arkadaşın seni challenge'a davet etti!",
        `/challenges/${challengeId}`
      )
    }
  }

  async respondChallengeInvite(notificationId: string, status: 'accepted' | 'rejected'): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('respond_challenge_invite', {
        p_notification_id: notificationId,
        p_status: status,
      })
      if (error) throw new Error(error.message)
    } else {
      // Local fallback: just find and mark as read/status
      const n = this.localNotifications.find((x) => x.id === notificationId)
      if (n) {
        n.action_status = status
        n.is_read = true
      }
    }
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('delete_challenge', {
        p_challenge_id: challengeId,
      })
      if (rpcError) {
        const { error: directError } = await supabase.from('challenges').delete().eq('id', challengeId)
        if (directError) throw new Error(rpcError.message || directError.message)
      }
      return
    }

    this.localChallenges = this.localChallenges.filter((c) => c.id !== challengeId)
  }

  async leaveChallenge(challengeId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('leave_challenge', {
        p_challenge_id: challengeId,
      })
      if (error) throw new Error(error.message)
      return
    }

    const currentUserId = this.localCurrentUserId
    const chg = this.localChallenges.find((c) => c.id === challengeId)
    if (chg) {
      chg.members = chg.members.filter((m) => m.user_id !== currentUserId && m.user_id !== 'usr_me')
      chg.is_user_member = false
    }
  }

  // --- LEADERBOARD ---
  async getLeaderboard(period: 'weekly' | 'monthly' | 'alltime'): Promise<LeaderboardEntry[]> {
    const profiles = await this.getAllProfiles()
    const workouts = await this.getFeedWorkouts()

    const entries: LeaderboardEntry[] = profiles.map((user) => {
      const userWkts = workouts.filter((w) => w.user_id === user.id)
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

  // --- NOTIFICATIONS (READ & UPDATE ONLY — NO CLIENT INSERT) ---
  async getNotifications(userId: string): Promise<AppNotification[]> {
    if (isSupabaseConfigured && supabase) {
      if (!userId) return []
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }
    return this.localNotifications
  }

  async markNotificationAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw new Error(error.message)
      return
    }

    const notif = this.localNotifications.find((n) => n.id === id)
    if (notif) notif.is_read = true
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
      if (error) throw new Error(error.message)
      return
    }

    this.localNotifications.forEach((n) => (n.is_read = true))
  }

  // --- ACHIEVEMENTS (READ ONLY — NO CLIENT INSERT) ---
  async getAchievements(): Promise<Achievement[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('achievements').select('*')
      if (error) throw new Error(error.message)
      return data || []
    }
    return SEED_ACHIEVEMENTS
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId)

      if (error) throw new Error(error.message)
      return data || []
    }
    return []
  }

  // --- WEB PUSH SUBSCRIPTIONS ---
  async checkPushSubscription(userId: string, endpoint: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false // PGRST116 is "no rows returned"
      return false
    }

    return !!data
  }

  async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const subJSON = subscription.toJSON()
      const endpoint = subJSON.endpoint
      const p256dh = subJSON.keys?.p256dh
      const auth = subJSON.keys?.auth

      if (!endpoint || !p256dh || !auth) throw new Error('Geçersiz PushSubscription verisi')

      // Since endpoint is UNIQUE, we use upsert or handle conflicts.
      // But we just use upsert based on endpoint. Wait, Supabase JS upsert needs conflict constraint.
      // Let's just delete the old one by endpoint if it exists, then insert.
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: userId,
        endpoint,
        p256dh,
        auth
      })

      if (error) throw new Error(error.message)
    }
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) throw new Error(error.message)
    }
  }
}

export const dataService = new DataService()
