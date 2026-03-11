'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ResultPreview from '@/components/ResultPreview'
import LimitCounter from '@/components/LimitCounter'

export default function ResultPage() {
  const params = useParams()
  const analysisId = params.id as string
  
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startError, setStartError] = useState('')
  const [startLoading, setStartLoading] = useState(false)
  const startedRef = useRef(false)
  const paymentPollCountRef = useRef(0)
  const searchParams = useSearchParams()
  const paymentSuccess = searchParams.get('payment') === 'success'

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Требуется авторизация')
          return
        }

        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisId)
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          setError('Анализ не найден')
          return
        }

        setAnalysis(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()

    // Polling для обновления статуса
    const interval = setInterval(async () => {
      const shouldPollStatus =
        analysis?.status === 'pending' ||
        analysis?.status === 'processing' ||
        (paymentSuccess && analysis?.status === 'completed' && !analysis?.is_paid)

      if (shouldPollStatus) {
        const { data } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisId)
          .single()
        
        if (data) {
          if (paymentSuccess && analysis?.status === 'completed' && !analysis?.is_paid) {
            paymentPollCountRef.current += 1
            if (paymentPollCountRef.current > 40) {
              clearInterval(interval)
            }
          }

          setAnalysis(data)
          if (data.status === 'completed' || data.status === 'failed') {
            if (!(paymentSuccess && data.status === 'completed' && !data.is_paid)) {
              clearInterval(interval)
            }
          }
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [analysisId, analysis?.status, analysis?.is_paid, paymentSuccess])

  useEffect(() => {
    const startAnalysis = async () => {
      if (!analysis || startedRef.current) return
      if (analysis.status !== 'pending') return

      startedRef.current = true
      setStartError('')
      setStartLoading(true)

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysisId }),
        })

        setStartLoading(false)

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Не удалось запустить анализ')
        }
      } catch (err: any) {
        console.error('Start analysis error:', err)
        setStartError(String(err?.message || err))
        setStartLoading(false)
        startedRef.current = false
      }
    }

    startAnalysis()
  }, [analysis, analysisId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-bold">Ошибка</p>
          <p>{error || 'Анализ не найден'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {analysis.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              {startError ? (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-left">
                  <div className="font-semibold">Ошибка запуска анализа</div>
                  <div className="mt-1 break-words">{startError}</div>
                  <div className="mt-2 text-sm">
                    Если ошибка про RLS/UPDATE — выполни SQL из `supabase/migrations/20260311_allow_update_analyses.sql` в Supabase SQL Editor.
                  </div>
                </div>
              ) : null}
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Файл загружается...
              </h3>
              <p className="text-blue-700">
                Пожалуйста, подождите. Это может занять несколько минут.
              </p>
            </div>
          )}

          {analysis.status === 'processing' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="animate-pulse mb-4">
                <svg className="w-16 h-16 text-yellow-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                AI анализирует чат...
              </h3>
              <p className="text-yellow-700">
                Это может занять 2-5 минут в зависимости от размера чата.
              </p>
            </div>
          )}

          {analysis.status === 'completed' && (
            <ResultPreview
              teaser={analysis.result_teaser || ''}
              fullResult={analysis.result_text}
              fileName={analysis.file_name}
            />
          )}

          {analysis.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                ❌ Ошибка анализа
              </h3>
              <p className="text-red-700">
                Произошла ошибка при анализе чата. Пожалуйста, попробуйте загрузить файл ещё раз.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <LimitCounter />
          
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Информация</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Файл:</dt>
                <dd className="text-gray-900 font-medium">{analysis.file_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Размер:</dt>
                <dd className="text-gray-900">{(analysis.file_size / 1024).toFixed(2)} KB</dd>
              </div>
              <div>
                <dt className="text-gray-500">Дата:</dt>
                <dd className="text-gray-900">
                  {new Date(analysis.created_at).toLocaleString('ru-RU')}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Статус:</dt>
                <dd className={`font-medium ${
                  analysis.status === 'completed' ? 'text-green-600' :
                  analysis.status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {analysis.status === 'completed' ? '✓ Готов' :
                   analysis.status === 'failed' ? '✗ Ошибка' :
                   analysis.status === 'processing' ? '⏳ Обрабатывается' :
                   '⏳ В очереди'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
