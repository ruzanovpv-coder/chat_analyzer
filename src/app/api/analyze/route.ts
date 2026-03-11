import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

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

function updatePolicyHint(message: string) {
  if (!isPermissionError(message)) return message
  return [
    message,
    'Missing UPDATE rights on `analyses` for authenticated users.',
    'Run SQL migration: `supabase/migrations/20260311_allow_update_analyses.sql` in Supabase SQL Editor.',
  ].join(' ')
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const sessionUserId = session.user.id
  const sessionUserEmail = session.user.email ?? undefined

  try {
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(
        { error: updatePolicyHint(String((fetchError as any)?.message || fetchError)) },
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
      .maybeSingle()

    if (lockError) {
      throw new Error(updatePolicyHint(String((lockError as any)?.message || lockError)))
    }

    // If we didn't get the lock (0 rows), another request already started it.
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
      throw new Error(updatePolicyHint(String((updateError as any)?.message || updateError)))
    }

    await supabase.rpc('increment_generation_count', { user_uuid: sessionUserId })

    // Email is optional; sendAnalysisEmail no-ops if keys are missing.
    try {
      if (sessionUserEmail) {
        await sendAnalysisEmail(sessionUserEmail, analysis.file_name, fullResult, true)
        await supabase
          .from('analyses')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', analysisId)
          .eq('user_id', sessionUserId)
      }
    } catch {
      // ignore email errors
    }

    return NextResponse.json({ success: true, analysisId })
  } catch (error: any) {
    try {
      await supabase
        .from('analyses')
        .update({ status: 'failed' })
        .eq('id', analysisId)
        .eq('user_id', sessionUserId)
    } catch {
      // ignore
    }

    return NextResponse.json(
      { error: updatePolicyHint(String(error?.message || 'Ошибка анализа')) },
      { status: 500 }
    )
  }
}

