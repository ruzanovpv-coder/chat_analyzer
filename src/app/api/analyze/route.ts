import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { analyzeChatWithGemini } from '@/lib/gemini-api'
import { analyzeChatWithClaude } from '@/lib/claude-api'
import { analyzeChatWithCohere } from '@/lib/cohere-api'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

export const runtime = 'nodejs'

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) return null

  if (serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: { user }, error } = await adminClient.auth.getUser(token)
      if (user?.id && !error) {
        console.log('[Auth] Success, user:', user.id)
        return user.id
      }
    } catch (err) {
      console.warn('[Auth] Service Role Key failed:', err)
    }
  }

  if (anonKey) {
    try {
      const client = createClient(supabaseUrl, anonKey)
      const { data: { user }, error } = await client.auth.getUser(token)
      if (user?.id && !error) {
        console.log('[Auth] Success with anon, user:', user.id)
        return user.id
      }
    } catch (err) {
      console.warn('[Auth] Anon failed:', err)
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  console.log('[POST] Started')
  
  const body = await request.json().catch(() => ({}))
  const rawAnalysisId = body.analysisId
  console.log('[POST] analysisId:', rawAnalysisId)
  
  if (!rawAnalysisId) {
    return NextResponse.json({ error: 'analysisId required' }, { status: 400 })
  }

  const analysisId = typeof rawAnalysisId === 'number' ? rawAnalysisId : Number.parseInt(String(rawAnalysisId), 10)
  if (!Number.isFinite(analysisId)) {
    return NextResponse.json({ error: 'analysisId invalid' }, { status: 400 })
  }

  // Try session-based auth first (from cookies)
  let sessionUserId: string | null = null
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      sessionUserId = session.user.id
      console.log('[POST] Got sessionUserId from cookies:', sessionUserId)
    }
  } catch (err) {
    console.warn('[POST] Session auth failed:', err)
  }

  // Fallback to JWT token auth if session not found
  if (!sessionUserId) {
    sessionUserId = await getAuthenticatedUserId(request)
    console.log('[POST] Got sessionUserId from JWT:', sessionUserId)
  }
  
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Config error' }, { status: 500 })
    }

    const dbClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

    console.log('[POST] Using client:', serviceRoleKey ? 'Service Role Key' : 'Anon Key')

    // First, check if analysis exists at all (without user_id filter)
    console.log('[POST] Checking if analysis exists:', analysisId)
    const { data: anyAnalysis, error: anyError } = await dbClient
      .from('analyses')
      .select('id, user_id, status')
      .eq('id', analysisId)
      .maybeSingle()
    
    console.log('[POST] Analysis exists check:', { 
      found: !!anyAnalysis, 
      analysisUserId: anyAnalysis?.user_id,
      status: anyAnalysis?.status,
      error: anyError?.message 
    })

    console.log('[POST] Fetching analysis:', { analysisId, sessionUserId })
    const { data: analysis, error: fetchError } = await dbClient
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .maybeSingle()

    console.log('[POST] Fetch result:', { 
      analysis: !!analysis, 
      analysisId: analysis?.id,
      userId: analysis?.user_id,
      status: analysis?.status,
      error: fetchError?.message,
      errorCode: fetchError?.code
    })

    if (fetchError) {
      return NextResponse.json({ error: 'Fetch error: ' + fetchError.message }, { status: 500 })
    }

    if (!analysis) {
      console.log('[POST] Analysis not found for:', { analysisId, sessionUserId })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (analysis.status !== 'pending') {
      return NextResponse.json({ success: true, status: analysis.status, analysisId })
    }

    const { data: locked, error: lockError } = await dbClient
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (lockError) throw new Error('Lock failed')
    if (!locked) return NextResponse.json({ success: true, status: 'processing', analysisId })

    console.log('[POST] Downloading file:', analysis.file_path)
    console.log('[POST] Using service role:', !!serviceRoleKey)
    
    // Create admin client for storage download (bypasses RLS)
    const storageClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { 
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
        })
      : dbClient
    
    const { data: fileData, error: downloadError } = await storageClient.storage.from('chat-files').download(analysis.file_path)
    if (downloadError) {
      console.error('[POST] Download error:', downloadError)
      throw new Error('Download failed: ' + downloadError.message)
    }
    if (!fileData) throw new Error('Download failed: no data')

    const fileText = await fileData.text()
    console.log('[POST] File size:', fileText.length)

    let analysisResult
    try {
      console.log('[POST] Trying Gemini...')
      analysisResult = await analyzeChatWithGemini(fileText)
      console.log('[POST] Gemini success')
    } catch (e: any) {
      console.warn('[POST] Gemini failed:', e?.message)
      try {
        console.log('[POST] Trying Claude...')
        analysisResult = await analyzeChatWithClaude(fileText)
        console.log('[POST] Claude success')
      } catch (e2: any) {
        console.warn('[POST] Claude failed:', e2?.message)
        try {
          console.log('[POST] Trying Cohere...')
          analysisResult = await analyzeChatWithCohere(fileText)
          console.log('[POST] Cohere success')
        } catch (e3: any) {
          console.warn('[POST] Cohere failed:', e3?.message)
          console.log('[POST] Trying Qwen...')
          analysisResult = await analyzeChatWithQwen(fileText)
          console.log('[POST] Qwen success')
        }
      }
    }

    const { fullResult, teaser } = analysisResult

    const { error: updateError } = await dbClient
      .from('analyses')
      .update({ status: 'completed', result_text: fullResult, result_teaser: teaser, is_paid: true })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)

    if (updateError) throw new Error('Update failed')

    await dbClient.rpc('increment_generation_count', { user_uuid: sessionUserId })

    try {
      const { data: { user } } = await dbClient.auth.admin.getUserById(sessionUserId)
      if (user?.email) {
        await sendAnalysisEmail(user.email, analysis.file_name, fullResult, true)
      }
    } catch (e) {
      console.warn('Email error:', e)
    }

    return NextResponse.json({ success: true, analysisId })
  } catch (error: any) {
    console.error('[POST] Error:', error?.message)
    console.error('[POST] Error stack:', error?.stack)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && anonKey) {
        const dbClient = serviceRoleKey
          ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
          : createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

        await dbClient.from('analyses').update({ status: 'failed' }).eq('id', analysisId).eq('user_id', sessionUserId)
      }
    } catch (e) {
      console.error('Failed to update status:', e)
    }

    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 })
  }
}
