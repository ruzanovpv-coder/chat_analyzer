'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnalysisLite = {
  id: number
  file_name: string
  created_at: string
  status: string
  is_paid: boolean
}

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const analysisIdParam = searchParams.get('analysisId')

  const [loading, setLoading] = useState(true)
  const [analyses, setAnalyses] = useState<AnalysisLite[]>([])
  const [selected, setSelected] = useState<AnalysisLite | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const selectedId = useMemo(() => {
    const n = analysisIdParam ? Number(analysisIdParam) : NaN
    return Number.isFinite(n) ? n : null
  }, [analysisIdParam])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        if (selectedId) {
          const { data } = await supabase
            .from('analyses')
            .select('id,file_name,created_at,status,is_paid')
            .eq('id', selectedId)
            .eq('user_id', user.id)
            .single()

          if (data) {
            setSelected(data as AnalysisLite)
            setAnalyses([data as AnalysisLite])
          }
        } else {
          const { data } = await supabase
            .from('analyses')
            .select('id,file_name,created_at,status,is_paid')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

          const list = (data || []) as AnalysisLite[]
          setAnalyses(list)

          const firstUnpaid = list.find(a => a.status === 'completed' && !a.is_paid) || null
          setSelected(firstUnpaid)
        }
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }

    load().catch((err) => console.error(err))
  }, [router, selectedId])

  const handlePay = async () => {
    if (!selected) return

    setError('')
    setPaying(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: selected.id }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать платёж')
      }

      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }

      throw new Error('Не удалось получить ссылку на оплату')
    } catch (err: any) {
      setError(err?.message || 'Ошибка оплаты')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  const canPay = !!selected && selected.status === 'completed' && !selected.is_paid

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Оплата анализа</h1>
          <p className="text-gray-600">Получите полный доступ к анализу за 250₽</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {!selected ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              Не найдено анализов, доступных для оплаты. Загрузите чат и дождитесь завершения анализа.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.length > 1 && !selectedId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Выберите анализ</label>
                <select
                  value={selected.id}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setSelected(analyses.find(a => a.id === id) || null)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {analyses
                    .filter(a => a.status === 'completed' && !a.is_paid)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        #{a.id} — {a.file_name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm text-gray-600">Файл</div>
                  <div className="font-semibold text-gray-900">{selected.file_name}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(selected.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={!canPay || paying}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {paying ? 'Переход к оплате...' : 'Оплатить 250₽'}
            </button>

            <div className="text-center text-sm text-gray-500">
              <p>Оплата принимается через безопасную систему</p>
              <div className="flex justify-center space-x-4 mt-2 flex-wrap gap-y-2">
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">Visa</span>
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">MasterCard</span>
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">Мир</span>
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">Apple Pay</span>
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">Google Pay</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            После оплаты полный результат будет доступен в вашем личном кабинете и отправлен на email.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-3 text-blue-600 hover:underline"
          >
            Перейти в dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
