import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ allowed: false, error: 'Требуется авторизация' }, { status: 401 })
    }

    const { data } = await supabase
      .from('users')
      .select('generations_used, generations_limit')
      .eq('id', session.user.id)
      .single()

    if (!data) {
      return NextResponse.json({ allowed: false, error: 'Пользователь не найден' }, { status: 404 })
    }

    const allowed = data.generations_used < data.generations_limit

    return NextResponse.json({
      allowed,
      used: data.generations_used,
      limit: data.generations_limit,
    })

  } catch (error: any) {
    return NextResponse.json(
      { allowed: false, error: error.message },
      { status: 500 }
    )
  }
}