import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Проверка авторизации
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    const userId = session.user.id

    // Проверка лимита
    const { data: userData } = await supabase
      .from('users')
      .select('generations_used, generations_limit')
      .eq('id', userId)
      .single()

    if (!userData || userData.generations_used >= userData.generations_limit) {
      return NextResponse.json(
        { error: 'Лимит генераций исчерпан' },
        { status: 403 }
      )
    }

    // Получение файла
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Файл слишком большой (макс. 10 МБ)' },
        { status: 400 }
      )
    }

    // Проверка типа
    if (!file.type.match(/^(text\/plain|application\/json)$/)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат файла' },
        { status: 400 }
      )
    }

    // Загрузка в Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Создание записи в analyses
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        status: 'pending',
        is_paid: true,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Анализ запускается на странице результата (/result/[id]), чтобы запрос шёл
    // с пользовательской сессией (cookies) и не обрывался после ответа.

    return NextResponse.json({ 
      success: true, 
      analysisId: analysis.id 
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}
