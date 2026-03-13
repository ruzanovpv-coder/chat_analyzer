import { getSupabaseAdmin } from './supabase'

export async function uploadFile(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseAdmin()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const fileName = `${timestamp}_${randomId}.${file.name.split('.').pop()}`
  const filePath = `${userId}/${fileName}`

  const { error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file)

  if (error) throw new Error(`Upload failed: ${error.message}`)
  
  return filePath
}

export async function downloadFile(filePath: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  
  const { data, error } = await supabase.storage
    .from('chat-files')
    .download(filePath)

  if (error) throw new Error(`Download failed: ${error.message}`)
  if (!data) throw new Error('No file data')

  return await data.text()
}
