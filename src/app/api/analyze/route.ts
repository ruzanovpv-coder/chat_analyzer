import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = await request.json()

    // Получение данных анализа
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*, users(email)')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    // Обновление статуса
    await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)

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
      await sendAnalysisEmail(
        analysis.users.email,
        analysis.file_name,
        teaser,
        false // пока не оплачено
      )

      await supabase
        .from('analyses')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', analysisId)
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Не прерываем процесс если email не отправился
    }

    return NextResponse.json({ success: true, analysisId })

  } catch (error: any) {
    console.error('Analysis error:', error)

    // Обновление статуса на failed
    const { analysisId } = await request.json()
    await supabase
      .from('analyses')
      .update({ status: 'failed' })
      .eq('id', analysisId)

    return NextResponse.json(
      { error: error.message || 'Ошибка анализа' },
      { status: 500 }
    )
  }
}