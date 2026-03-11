'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import LimitCounter from '@/components/LimitCounter'

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (data) {
          setAnalyses(data)
        }
      } catch (error) {
        console.error('Error fetching analyses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyses()

    // Keep refreshing while user is on the page so pending/processing items update.
    const interval = setInterval(() => {
      fetchAnalyses().catch(() => null)
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '✓ Готов'
      case 'processing': return '⏳ Обрабатывается'
      case 'failed': return '✗ Ошибка'
      default: return '⏳ В очереди'
    }
  }

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Ваш анализатор чатов</h1>
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Загрузить чат
              </Link>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Как это работает?</h3>
                <ol className="text-blue-800 space-y-1">
                  <li>1. Экспортируйте чат из Telegram в формате JSON или TXT</li>
                  <li>2. Загрузите файл на наш сервер</li>
                  <li>3. AI проанализирует ваш чат</li>
                  <li>4. Получите подробный отчет на email</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ваши анализы</h3>
                {analyses.length === 0 ? (
                  <p className="text-gray-600">У вас пока нет анализов. Загрузите первый чат!</p>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis) => (
                      <div key={analysis.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{analysis.file_name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(analysis.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(analysis.status)}`}>
                            {getStatusText(analysis.status)}
                          </span>
                          {analysis.status !== 'completed' && (
                            <Link
                              href={`/result/${analysis.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Open
                            </Link>
                          )}
                          {analysis.status === 'completed' && (
                            <Link
                              href={`/result/${analysis.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Посмотреть результат
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <LimitCounter />
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Статистика</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Всего анализов:</span>
                <span className="font-medium">{analyses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Готовых:</span>
                <span className="font-medium text-green-600">
                  {analyses.filter(a => a.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">В обработке:</span>
                <span className="font-medium text-yellow-600">
                  {analyses.filter(a => a.status === 'processing').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ошибок:</span>
                <span className="font-medium text-red-600">
                  {analyses.filter(a => a.status === 'failed').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
