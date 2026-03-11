'use client'

import { useMemo, useState } from 'react'

function mask(value: string, start = 10, end = 6) {
  if (!value) return '(empty)'
  if (value.length <= start + end) return value
  return `${value.slice(0, start)}…${value.slice(-end)}`
}

export default function DebugPage() {
  const rawSupabaseUrl = useMemo(() => process.env.NEXT_PUBLIC_SUPABASE_URL || '', [])
  const rawAnonKey = useMemo(() => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', [])

  const supabaseUrl = useMemo(() => rawSupabaseUrl.trim(), [rawSupabaseUrl])
  const anonKey = useMemo(() => rawAnonKey.trim(), [rawAnonKey])
  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), [])

  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    setResult('')
    try {
      if (!supabaseUrl || !anonKey) {
        setResult('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in this build.')
        return
      }

      const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`
      const tokenUrl = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`

      let corsText = ''
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          mode: 'cors',
        })
        corsText = `cors: status=${res.status} ok=${res.ok} type=${res.type} body=${await res.text().catch(() => '')}`
      } catch (e: any) {
        corsText = `cors: error=${e?.name || 'Error'} message=${e?.message || String(e)}`
      }

      // 1b) CORS-mode POST request (token endpoint)
      let tokenText = ''
      try {
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: `debug+${Date.now()}@example.com`,
            password: 'not-a-real-password',
          }),
          mode: 'cors',
        })
        tokenText = `token: status=${res.status} ok=${res.ok} type=${res.type} body=${await res.text().catch(() => '')}`
      } catch (e: any) {
        tokenText = `token: error=${e?.name || 'Error'} message=${e?.message || String(e)}`
      }

      let noCorsText = ''
      try {
        const res = await fetch(url, {
          method: 'GET',
          mode: 'no-cors',
        })
        noCorsText = `no-cors: status=${res.status} ok=${res.ok} type=${res.type} (opaque is expected)`
      } catch (e: any) {
        noCorsText = `no-cors: error=${e?.name || 'Error'} message=${e?.message || String(e)}`
      }

      setResult([corsText, tokenText, noCorsText].join('\n'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Диагностика</h1>
        <p className="text-gray-600 mt-1">Проверка переменных Supabase и доступа к Auth API без DevTools.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-2">
        <div className="text-sm text-gray-600">Текущий Origin</div>
        <div className="font-mono break-words">{origin || '(unknown)'}</div>

        <div className="text-sm text-gray-600 mt-4">NEXT_PUBLIC_SUPABASE_URL</div>
        <div className="font-mono break-words">{supabaseUrl || '(empty)'}</div>
        <div className="text-xs text-gray-500">
          rawLen={rawSupabaseUrl.length} trimmedLen={supabaseUrl.length} changed={String(rawSupabaseUrl !== supabaseUrl)}
        </div>

        <div className="text-sm text-gray-600 mt-4">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
        <div className="font-mono break-words">{mask(anonKey)}</div>
        <div className="text-xs text-gray-500">
          rawLen={rawAnonKey.length} trimmedLen={anonKey.length} changed={String(rawAnonKey !== anonKey)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <button
          onClick={run}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Проверяю…' : 'Запустить проверку'}
        </button>

        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200 min-h-[120px]">
          {result || 'Нажми кнопку, чтобы выполнить запросы.'}
        </pre>

        <p className="text-sm text-gray-600">
          Подсказка: если строка <span className="font-mono">cors:</span> падает с <span className="font-mono">Failed to fetch</span>, а{' '}
          <span className="font-mono">no-cors:</span> показывает <span className="font-mono">type=opaque</span> — это почти всегда CORS/Allowed
          Origins.
        </p>
      </div>
    </div>
  )
}
