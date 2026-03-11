'use client'

import { useState } from 'react'

interface ResultPreviewProps {
  teaser: string
  fullResult: string | null
  isPaid: boolean
  fileName: string
}

export default function ResultPreview({ 
  teaser, 
  fullResult, 
  isPaid,
  fileName 
}: ResultPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = isPaid && fullResult ? fullResult : teaser
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = isPaid && fullResult ? fullResult : teaser
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analysis_${fileName.replace(/\.[^/.]+$/, '')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          Результат анализа
        </h3>
        <div className="space-x-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? '✓ Скопировано' : '📋 Копировать'}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 Скачать TXT
          </button>
        </div>
      </div>

      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-gray-800 bg-gray-50 p-4 rounded-lg">
          {isPaid && fullResult ? fullResult : teaser}
        </pre>
      </div>

      {!isPaid && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
          <h4 className="text-xl font-bold text-green-900 mb-3">
            🎁 Получите полный анализ за 250₽
          </h4>
          <ul className="space-y-2 text-green-800 mb-6">
            <li>✓ Все 10 измерений анализа</li>
            <li>✓ Детальные профили участников</li>
            <li>✓ Карта тем и болей</li>
            <li>✓ 10-20 идей для контента</li>
            <li>✓ PDF-отчёт</li>
            <li>✓ Приоритетная поддержка</li>
          </ul>
          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
            Оплатить и получить полный доступ
          </button>
        </div>
      )}
    </div>
  )
}