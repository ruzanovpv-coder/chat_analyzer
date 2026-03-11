'use client'

import { useState } from 'react'

interface ResultPreviewProps {
  teaser: string
  fullResult: string | null
  fileName: string
}

export default function ResultPreview({ teaser, fullResult, fileName }: ResultPreviewProps) {
  const [copied, setCopied] = useState(false)

  const analysisText = fullResult || teaser

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysisText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([analysisText], { type: 'text/plain;charset=utf-8' })
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
        <h3 className="text-xl font-bold text-gray-900">Результат анализа</h3>
        <div className="space-x-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Скачать TXT
          </button>
        </div>
      </div>

      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-gray-800 bg-gray-50 p-4 rounded-lg">
          {analysisText}
        </pre>
      </div>
    </div>
  )
}

