'use client'

import { useEffect, useMemo, useState } from 'react'

type ClientErrorLike = {
  message: string
  stack?: string
}

export default function ClientErrorPanel() {
  const [error, setError] = useState<ClientErrorLike | null>(null)

  const enabled = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.has('debug')
  }, [])

  useEffect(() => {
    if (!enabled) return

    const onError = (event: ErrorEvent) => {
      const message = event?.error?.message || event?.message || 'Unknown error'
      const stack = event?.error?.stack
      setError({ message, stack })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event?.reason
      const message = reason?.message || String(reason || 'Unhandled rejection')
      const stack = reason?.stack
      setError({ message, stack })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [enabled])

  if (!enabled || !error) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-red-200 bg-red-50 p-3 text-red-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div className="font-semibold">Client error (debug)</div>
          <button
            className="rounded bg-red-600 px-2 py-1 text-sm text-white"
            onClick={() => setError(null)}
          >
            Close
          </button>
        </div>
        <div className="mt-2 text-sm">
          <div className="break-words">{error.message}</div>
          {error.stack ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white/60 p-2 text-xs">
              {error.stack}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}

