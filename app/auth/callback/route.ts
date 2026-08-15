import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/onboarding'

  if (code && supabaseUrl && supabaseAnonKey) {
    const cookieStore = await request.cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // Ignored in Route Handlers
          }
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If no code or error, redirect to onboarding / home so client SDK can process hash if present
  return NextResponse.redirect(new URL('/onboarding', request.url))
}
