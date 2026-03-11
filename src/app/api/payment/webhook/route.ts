import { NextRequest, NextResponse } from 'next/server'
import { getYooKassaPayment } from '@/lib/yookassa'
import { sendAnalysisEmail } from '@/lib/email'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PRICE_RUB = '250.00'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const token = process.env.YOOKASSA_WEBHOOK_TOKEN
    if (token) {
      const headerToken = req.headers.get('x-yookassa-webhook-token')
      if (headerToken !== token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload = await req.json().catch(() => null)
    const paymentId = payload?.object?.id
    if (!paymentId) {
      return NextResponse.json({ ok: true })
    }

    const payment = await getYooKassaPayment(String(paymentId))

    if (payment.status !== 'succeeded' || payment.paid !== true) {
      return NextResponse.json({ ok: true })
    }

    if (payment.amount?.currency !== 'RUB' || payment.amount?.value !== PRICE_RUB) {
      return NextResponse.json({ ok: true })
    }

    const analysisId = payment.metadata?.analysisId
    const userId = payment.metadata?.userId
    if (!analysisId || !userId) {
      return NextResponse.json({ ok: true })
    }

    const { data: analysis } = await admin
      .from('analyses')
      .select('id, user_id, is_paid, result_text, result_teaser, file_name, users(email)')
      .eq('id', Number(analysisId))
      .single()

    if (!analysis || analysis.user_id !== userId) {
      return NextResponse.json({ ok: true })
    }

    if (analysis.is_paid) {
      return NextResponse.json({ ok: true })
    }

    await admin
      .from('analyses')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        yookassa_payment_id: payment.id,
        yookassa_payment_status: payment.status,
      })
      .eq('id', analysis.id)
      .eq('user_id', userId)

    // Увеличиваем лимит генераций на 1, чтобы пользователь мог загрузить следующий чат
    await admin.rpc('increment_generation_limit', { user_uuid: userId, delta: 1 })

    // Отправляем полный результат на email (1 раз после оплаты)
    const recipient = (analysis as any).users?.email
    const fullResult = analysis.result_text || analysis.result_teaser || ''
    if (recipient && fullResult) {
      await sendAnalysisEmail(recipient, analysis.file_name, fullResult, true)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    // YooKassa expects 200 on webhook; errors should be logged in platform
    return NextResponse.json({ ok: true })
  }
}
