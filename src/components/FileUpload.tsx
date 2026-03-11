'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['text/plain', 'application/json']

interface FileUploadProps {
  onUploadComplete: (analysisId: string) => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const router = useRouter()

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('')

    // Проверка отклонённых файлов
    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors[0].code
      if (reason === 'file-too-large') {
        setError('Файл слишком большой. Максимальный размер: 10 МБ')
      } else if (reason === 'file-invalid-type') {
        setError('Неподдерживаемый формат. Используйте TXT или JSON')
      }
      return
    }

    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)
    setProgress(0)

    try {
      // Проверка лимита
      const checkResponse = await fetch('/api/check-limit')
      const checkData = await checkResponse.json()

      if (!checkData.allowed) {
        throw new Error('Лимит генераций исчерпан. Оплатите следующий анализ.')
      }

      // Загрузка файла
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Ошибка загрузки')
      }

      const data = await uploadResponse.json()
      setProgress(100)

      // Перенаправление на страницу результата
      setTimeout(() => {
        onUploadComplete(data.analysisId)
      }, 500)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Загрузка файла...</p>
            {progress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{progress}%</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-lg text-gray-700">
              {isDragActive
                ? 'Отпустите файл здесь'
                : 'Перетащите файл сюда или нажмите для выбора'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Поддерживаемые форматы: TXT, JSON (макс. 10 МБ)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}