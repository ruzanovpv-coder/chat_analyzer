'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function LimitCounter() {
  const [used, setUsed] = useState(0)
  const [limit, setLimit] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('users')
          .select('generations_used, generations_limit')
          .eq('id', user.id)
          .single()

        if (data) {
          setUsed(data.generations_used)
          setLimit(data.generations_limit)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchLimit().catch((err) => console.error(err))
  }, [])

  if (loading) return null

  const percentage = (used / limit) * 100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Ваш лимит генераций
      </h3>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Использовано</span>
          <span className="font-medium">{used} из {limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              percentage >= 100 ? 'bg-red-600' : percentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {used >= limit ? (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Лимит исчерпан
          </p>
          <p className="text-sm text-red-600 mt-1">
            Следующий анализ стоит 250₽
          </p>
        </div>
      ) : (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            ✅ Доступно бесплатных анализов: {limit - used}
          </p>
        </div>
      )}
    </div>
  )
}
