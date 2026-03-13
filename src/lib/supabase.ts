import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export function getSupabaseRouteHandler() {
  return createRouteHandlerClient({ cookies })
}

export async function getUserIdFromSession(): Promise<string | null> {
  const supabase = getSupabaseRouteHandler()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}
