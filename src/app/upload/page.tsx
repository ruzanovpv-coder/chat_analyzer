'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'
import LimitCounter from '@/components/LimitCounter'
import { supabase } from '@/lib/supabase/client'

export default function UploadPage() {
  const router = useRouter()

  useEffect(() => {
    const ensureAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      }
    }

    ensureAuth()
  }, [router])

  const handleUploadComplete = (analysisId: string) => {
    router.push(`/result/${analysisId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Загрузите чат для анализа
        </h1>
        <p className="text-xl text-gray-600">
          Экспорт чата из Telegram и получите глубокий анализ взаимоотношений
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-2">
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>
        <div>
          <LimitCounter />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          📋 Как экспортировать чат из Telegram:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Откройте чат в Telegram Desktop</li>
          <li>Нажмите на три точки (⋮) в правом верхнем углу</li>
          <li>Выберите &quot;Экспорт истории чата&quot;</li>
          <li>Выберите формат &quot;JSON&quot; или &quot;TXT&quot;</li>
          <li>Нажмите &quot;Экспортировать&quot;</li>
          <li>Загрузите полученный файл выше</li>
        </ol>
      </div>
    </div>
  )
}
