import { getSupabaseAdmin } from './supabase'

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Analysis {
  id: number
  user_id: string
  file_name: string
  file_path: string
  status: AnalysisStatus
  result_text: string | null
  result_teaser: string | null
  is_paid: boolean
  created_at: string
}

export async function createAnalysis(
  userId: string,
  fileName: string,
  filePath: string,
  fileSize: number
): Promise<number> {
  const supabase = getSupabaseAdmin()
  
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      status: 'pending',
      is_paid: false
    })
    .select('id')
    .single()

  if (error) throw new Error(`Create failed: ${error.message}`)
  return data.id
}

export async function getAnalysis(analysisId: number, userId: string): Promise<Analysis | null> {
  const supabase = getSupabaseAdmin()
  
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Fetch failed: ${error.message}`)
  return data
}

export async function updateAnalysisStatus(
  analysisId: number,
  userId: string,
  status: AnalysisStatus
): Promise<void> {
  const supabase = getSupabaseAdmin()
  
  const { error } = await supabase
    .from('analyses')
    .update({ status })
    .eq('id', analysisId)
    .eq('user_id', userId)

  if (error) throw new Error(`Update failed: ${error.message}`)
}

export async function completeAnalysis(
  analysisId: number,
  userId: string,
  fullResult: string,
  teaser: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  
  const { error } = await supabase
    .from('analyses')
    .update({
      status: 'completed',
      result_text: fullResult,
      result_teaser: teaser,
      is_paid: true
    })
    .eq('id', analysisId)
    .eq('user_id', userId)

  if (error) throw new Error(`Complete failed: ${error.message}`)
}

export async function getUserGenerationCount(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  
  const { data, error } = await supabase
    .from('users')
    .select('generations_used')
    .eq('id', userId)
    .maybeSingle()

  if (error) return 0
  return data?.generations_used || 0
}

export async function incrementGenerationCount(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase.rpc('increment_generation_count', { user_uuid: userId })
}
