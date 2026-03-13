import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

export function createClient() {
  return createClientComponentClient()
}
