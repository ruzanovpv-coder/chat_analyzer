import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Клиент для браузера (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Клиент для сервера (с полными правами)
export const getServerSupabase = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Получить текущего пользователя
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

// Проверка лимита генераций
export const checkGenerationLimit = async (userId: string) => {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('generations_used, generations_limit')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.generations_used < data.generations_limit
}

// Увеличение счётчика использований
export const incrementGenerationCount = async (userId: string) => {
  const supabase = getServerSupabase()
  await supabase.rpc('increment_generation_count', { user_uuid: userId })
}