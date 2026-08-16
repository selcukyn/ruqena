import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Configure web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@ruqena.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

// Ensure we have service role key to bypass RLS and fetch receiver's subscriptions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: Request) {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase service configuration missing' }, { status: 500 })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the caller is an authenticated user
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })
    
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { receiverId, title, message, url } = body

    if (!receiverId || !title || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Use admin client ONLY to fetch the receiver's push subscriptions (bypassing RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Fetch all push subscriptions for the receiver
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', receiverId)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found for user' })
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/notifications'
    })

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
          return { success: true }
        } catch (err: any) {
          console.error('Push send error:', err)
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          return {
            success: false,
            statusCode: err.statusCode || 500,
            errorName: err.name || 'UnknownError'
          }
        }
      })
    )

    const successes = results.filter(r => r.success).length
    const failures = results.length - successes

    if (failures > 0) {
      const errorDetails = results.filter(r => !r.success).map(r => ({
        statusCode: r.statusCode,
        error: r.errorName
      }))

      if (successes === 0) {
        return NextResponse.json(
          { error: 'All push notifications failed', details: errorDetails },
          { status: 500 }
        )
      } else {
        return NextResponse.json(
          { success: true, partial: true, message: 'Some push notifications failed', details: errorDetails },
          { status: 207 }
        )
      }
    }

    return NextResponse.json({ success: true, message: 'All push notifications sent successfully' })
  } catch (error: any) {
    console.error('Unexpected error in push route:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
