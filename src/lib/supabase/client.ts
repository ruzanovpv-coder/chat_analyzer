'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  cached = createClientComponentClient({
    supabaseUrl,
    supabaseKey,
  })
  return cached
}

// Avoid eager initialization at module load time (can run during Vercel build/prerender).
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient() as any
    const value = client[prop as any]

    if (typeof value === 'function') {
      return value.bind(client)
    }

    return value
  },
}) as any
