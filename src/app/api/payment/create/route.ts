import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { createYooKassaPayment } from '@/lib/yookassa'

export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_RUB = '250.00'

export async function POST(req: NextRequest) {
  try {
    const auth = createRouteHandlerClient({ cookies })
    const { data: { session } } = await auth.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const analysisId = body.analysisId
    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
    }

    const { data: analysis, error: analysisError } = await admin
      .from('analyses')
      .select('id, user_id, status, is_paid, file_name')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    if (analysis.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    if (analysis.is_paid) {
      return NextResponse.json({ error: 'Уже оплачено' }, { status: 400 })
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json({ error: 'Анализ ещё не готов' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${appUrl}/result/${analysis.id}?payment=success`

    const payment = await createYooKassaPayment({
      amountValue: PRICE_RUB,
      description: `Chat Analyzer: полный результат (${analysis.file_name})`,
      returnUrl,
      metadata: {
        analysisId: String(analysis.id),
        userId: String(analysis.user_id),
      },
      idempotenceKey: crypto.randomUUID(),
    })

    await admin
      .from('analyses')
      .update({
        yookassa_payment_id: payment.id,
        yookassa_payment_status: payment.status,
      })
      .eq('id', analysis.id)
      .eq('user_id', session.user.id)

    const confirmationUrl = payment.confirmation?.confirmation_url
    if (!confirmationUrl) {
      return NextResponse.json({ error: 'Не удалось получить ссылку на оплату' }, { status: 500 })
    }

    return NextResponse.json({ confirmationUrl, paymentId: payment.id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Ошибка создания платежа' }, { status: 500 })
  }
}
