import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  let analysisId: number | string | undefined
  let sessionUserId: string | undefined
  let sessionUserEmail: string | undefined

  try {
    const body = await request.json().catch(() => ({}))
    analysisId = body.analysisId

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
    }

    const authSupabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await authSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    sessionUserId = session.user.id
    sessionUserEmail = session.user.email ?? undefined

    // Получение данных анализа
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*, users(email)')
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .single()

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    if (analysis.status !== 'pending') {
      return NextResponse.json({ success: true, status: analysis.status, analysisId })
    }

    // Пытаемся "залочить" анализ: переводим pending -> processing атомарно.
    const { data: locked, error: lockError } = await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)
      .eq('user_id', sessionUserId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (lockError || !locked) {
      return NextResponse.json({ success: true, status: 'processing', analysisId })
    }

    // Скачивание файла из Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-files')
      .download(analysis.file_path)

    if (downloadError || !fileData) {
      throw new Error('Не удалось скачать файл')
    }

    // Чтение текста из файла
    const fileText = await fileData.text()

    // Анализ через Qwen
    const { fullResult, teaser } = await analyzeChatWithQwen(fileText)

    // Сохранение результата
    await supabase
      .from('analyses')
      .update({
        status: 'completed',
        result_text: fullResult,
        result_teaser: teaser,
      })
      .eq('id', analysisId)

    // Увеличение счётчика
    await supabase.rpc('increment_generation_count', { user_uuid: analysis.user_id })

    // Отправка email
    try {
      const recipient = analysis.users?.email || sessionUserEmail
      if (recipient) {
        await sendAnalysisEmail(
          recipient,
          analysis.file_name,
          teaser,
          false // пока не оплачено
        )

        await supabase
          .from('analyses')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', analysisId)
          .eq('user_id', sessionUserId)
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Не прерываем процесс если email не отправился
    }

    return NextResponse.json({ success: true, analysisId })

  } catch (error: any) {
    console.error('Analysis error:', error)

    // Обновление статуса на failed
    if (analysisId && sessionUserId) {
      await supabase
        .from('analyses')
        .update({ status: 'failed' })
        .eq('id', analysisId)
        .eq('user_id', sessionUserId)
    }

    return NextResponse.json(
      { error: error.message || 'Ошибка анализа' },
      { status: 500 }
    )
  }
}
