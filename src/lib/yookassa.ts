type YooKassaAmount = {
  value: string
  currency: 'RUB'
}

type YooKassaPayment = {
  id: string
  status: string
  paid?: boolean
  amount?: YooKassaAmount
  metadata?: Record<string, any>
  confirmation?: {
    type?: string
    confirmation_url?: string
  }
}

function getAuthHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    throw new Error('Missing YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY env vars')
  }

  const token = Buffer.from(`${shopId}:${secretKey}`).toString('base64')
  return `Basic ${token}`
}

const YOOKASSA_API_BASE = process.env.YOOKASSA_API_BASE_URL || 'https://api.yookassa.ru/v3'

export async function createYooKassaPayment(params: {
  amountValue: string
  description: string
  returnUrl: string
  metadata: Record<string, any>
  idempotenceKey: string
}): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': params.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: params.amountValue, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description,
      metadata: params.metadata,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data) {
    const msg = typeof (data as any)?.description === 'string'
      ? (data as any).description
      : `YooKassa create payment failed (${res.status})`
    throw new Error(msg)
  }

  return data as YooKassaPayment
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data) {
    throw new Error(`YooKassa get payment failed (${res.status})`)
  }

  return data as YooKassaPayment
}

