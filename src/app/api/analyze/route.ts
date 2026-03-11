import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function isPermissionError(message: string) {
  const m = message.toLowerCase()
  return (
    m.includes('permission denied') ||
    m.includes('row-level security') ||
    m.includes('violates row-level security') ||
    m.includes('rls')
  )
}

function isAuthKeyError(message: string) {
  const m = message.toLowerCase()
  return (
    m.includes('invalid api key') ||
    m.includes('apikey') && m.includes('invalid') ||
    m.includes('jwt') && m.includes('invalid') ||
    m.includes('401') ||
    m.includes('403')
  )
}

export async function POST(request: NextRequest) {
  const authSupabase = createRouteHandlerClient({ cookies })

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

  const { data: { session } } = await authSupabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const sessionUserId = session.user.id
  const sessionUserEmail = session.user.email ?? undefined

  // Prefer admin client if configured (bypasses RLS), but fall back to the user's session client.
  let admin: any = null
  try {
    admin = getSupabaseAdminClient()
  } catch {
    admin = null
  }

  const getWorkingClient = async () => {
    if (!admin) return authSupabase

    const { error } = await admin
      .from('analyses')
      .select('id')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .maybeSingle()

    if (!error) return admin

    const msg = String((error as any)?.message || error)
    if (isAuthKeyError(msg)) {
      // Admin key is misconfigured; fall back to session client which uses anon key + cookies.
      return authSupabase
    }

    // Non-auth error: keep admin, we will report the real message below.
    return admin
  }

  const supabase = await getWorkingClient()

  try {
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: (fetchError as any)?.message || 'Ошибка чтения анализа' },
        { status: 500 }
      )
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    if (analysis.status !== 'pending') {
      return NextResponse.json({ success: true, status: analysis.status, analysisId })
    }

    // Atomically lock: pending -> processing
    const { data: locked, error: lockError } = await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (lockError) {
      const msg = String((lockError as any)?.message || lockError)
      if (isPermissionError(msg)) {
        throw new Error(
          'Нет прав на UPDATE таблицы analyses (RLS/GRANT). Выполни миграцию, которая добавляет policy + GRANT UPDATE для authenticated.'
        )
      }
      throw new Error(msg)
    }

    if (!locked) {
      return NextResponse.json({ success: true, status: 'processing', analysisId })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-files')
      .download(analysis.file_path)

    if (downloadError || !fileData) {
      throw new Error('Не удалось скачать файл из Storage')
    }

    const fileText = await fileData.text()
    const { fullResult, teaser } = await analyzeChatWithQwen(fileText)

    const { error: updateError } = await supabase
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
      const msg = String((updateError as any)?.message || updateError)
      if (isPermissionError(msg)) {
        throw new Error(
          'Нет прав на UPDATE таблицы analyses (RLS/GRANT). Выполни миграцию, которая добавляет policy + GRANT UPDATE для authenticated.'
        )
      }
      throw new Error(msg)
    }

    // Increase counter
    await supabase.rpc('increment_generation_count', { user_uuid: sessionUserId })

    // Send email (optional; noop if no env keys)
    try {
      if (sessionUserEmail) {
        await sendAnalysisEmail(sessionUserEmail, analysis.file_name, fullResult, true)
        await supabase
          .from('analyses')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', analysisId)
          .eq('user_id', sessionUserId)
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
    }

    return NextResponse.json({ success: true, analysisId })
  } catch (error: any) {
    console.error('Analysis error:', error)

    try {
      await supabase
        .from('analyses')
        .update({ status: 'failed' })
        .eq('id', analysisId)
        .eq('user_id', sessionUserId)
    } catch {
      // ignore
    }

    return NextResponse.json({ error: error?.message || 'Ошибка анализа' }, { status: 500 })
  }
}
