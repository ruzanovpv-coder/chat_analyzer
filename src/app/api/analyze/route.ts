import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeChatWithGemini } from '@/lib/gemini-api'
import { analyzeChatWithCohere } from '@/lib/cohere-api'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

export const runtime = 'nodejs'

/**
 * Get authenticated user ID using JWT token from Authorization header
 */
async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    return null
  }

  // Try with Service Role Key first
  if (serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { data: { user }, error } = await adminClient.auth.getUser(token)
      if (user?.id && !error) {
        console.log('[Auth] JWT token auth successful with Service Role Key')
        return user.id
      }
    } catch (err) {
      console.warn('[Auth] Service Role Key auth failed, trying anon key:', err)
    }
  }

  // Fallback to anon key
  if (anonKey) {
    try {
      const client = createClient(supabaseUrl, anonKey)
      const { data: { user }, error } = await client.auth.getUser(token)
      if (user?.id && !error) {
        console.log('[Auth] JWT token auth successful with anon key')
        return user.id
      }
    } catch (err) {
      console.warn('[Auth] Anon key auth failed:', err)
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const rawAnalysisId = body.analysisId as number | string | undefined
  if (!rawAnalysisId) {
    return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
  }

  const analysisId =
    typeof rawAnalysisId === 'number'
      ? rawAnalysisId
      : Number.parseInt(String(rawAnalysisId), 10)

  if (!Number.isFinite(analysisId)) {
    return NextResponse.json({ error: 'analysisId must be a number' }, { status: 400 })
  }

  // Get authenticated user ID
  const sessionUserId = await getAuthenticatedUserId(request)
  if (!sessionUserId) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    )
  }

  let sessionUserEmail: string | undefined = undefined

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Конфигурация сервера неполная' },
        { status: 500 }
      )
    }

    const dbClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

    // Get user email
    if (serviceRoleKey) {
      try {
        const { data: { user } } = await dbClient.auth.admin.getUserById(sessionUserId)
        sessionUserEmail = user?.email
      } catch {
        // Email is optional
      }
    }

    // Fetch analysis
    const { data: analysis, error: fetchError } = await dbClient
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Ошибка при получении анализа' }, { status: 500 })
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    if (analysis.status !== 'pending') {
      return NextResponse.json({ success: true, status: analysis.status, analysisId })
    }

    // Lock analysis
    const { data: locked, error: lockError } = await dbClient
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (lockError) {
      console.error('Lock error:', lockError)
      throw new Error('Не удалось заблокировать анализ')
    }

    if (!locked) {
      return NextResponse.json({ success: true, status: 'processing', analysisId })
    }

    // Download file
    console.log('[Analyze] Downloading file:', analysis.file_path)
    const { data: fileData, error: downloadError } = await dbClient.storage
      .from('chat-files')
      .download(analysis.file_path)

    if (downloadError || !fileData) {
      console.error('[Analyze] Download error:', downloadError)
      throw new Error('Не удалось скачать файл')
    }

    const fileText = await fileData.text()
    console.log('[Analyze] File size:', fileText.length)

    // Try AI providers: Gemini → Cohere → Qwen
    let analysisResult
    try {
      console.log('[Analyze] Trying Gemini')
      analysisResult = await analyzeChatWithGemini(fileText)
      console.log('[Analyze] Gemini success')
    } catch (geminiError) {
      console.warn('[Analyze] Gemini failed:', geminiError)
      try {
        console.log('[Analyze] Trying Cohere')
        analysisResult = await analyzeChatWithCohere(fileText)
        console.log('[Analyze] Cohere success')
      } catch (cohereError) {
        console.warn('[Analyze] Cohere failed:', cohereError)
        try {
          console.log('[Analyze] Trying Qwen')
          analysisResult = await analyzeChatWithQwen(fileText)
          console.log('[Analyze] Qwen success')
        } catch (qwenError) {
          console.error('[Analyze] All providers failed:', qwenError)
          throw new Error('Не удалось проанализировать чат')
        }
      }
    }

    const { fullResult, teaser } = analysisResult

    // Update database
    const { error: updateError } = await dbClient
      .from('analyses')
      .update({
        status: 'completed',
        result_text: fullResult,
        result_teaser: teaser,
        is_paid: true,
      })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error('Не удалось сохранить результаты')
    }

    // Increment counter
    await dbClient.rpc('increment_generation_count', { user_uuid: sessionUserId })

    // Send email
    try {
      if (sessionUserEmail) {
        await sendAnalysisEmail(sessionUserEmail, analysis.file_name, fullResult, true)
        await dbClient
          .from('analyses')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', analysisId)
          .eq('user_id', sessionUserId)
      }
    } catch (emailErr) {
      console.warn('Email error:', emailErr)
    }

    return NextResponse.json({ success: true, analysisId })
  } catch (error: any) {
    console.error('Analysis error:', error)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && anonKey) {
        const dbClient = serviceRoleKey
          ? createClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })
          : createClient(supabaseUrl, anonKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })

        await dbClient
          .from('analyses')
          .update({ status: 'failed' })
          .eq('id', analysisId)
          .eq('user_id', sessionUserId)
      }
    } catch (updateErr) {
      console.error('Failed to update status:', updateErr)
    }

    return NextResponse.json(
      { error: error?.message || 'Ошибка анализа' },
      { status: 500 }
    )
  }
}
