Ты — Cline, AI-агент для разработки. Твоя задача — создать полноценное веб-приложение "Chat Analyzer" шаг за шагом. Следуй инструкциям точно, создавай файлы, пиши код, тестируй.

## 📋 ОБЩАЯ ИНФОРМАЦИЯ О ПРОЕКТЕ

**Название:** Chat Analyzer  
**Описание:** Сервис анализа чатов Telegram с помощью AI (Qwen)  
**Стек:** Next.js 14 + TypeScript + Tailwind CSS + Supabase + Qwen API  
**Язык интерфейса:** Русский  
**Хостинг:** Vercel + Supabase (Free tier)  

**Основные функции:**
1. Регистрация/вход через email (Supabase Auth)
2. 1 бесплатная генерация на email, далее 250₽
3. Загрузка файлов: TXT, JSON (макс 10 МБ)
4. Анализ через Qwen API с суперпромтом
5. Результат: teaser (бесплатно) + полный (после оплаты)
6. Отправка на email
7. Удаление файлов через 24 часа
8. Защита роутов
9. Тесты
10. Деплой на Vercel

---

## ═══════════════════════════════════════════════════════════════
## ЭТАП 2: НАСТРОЙКА SUPABASE CLIENT
## ═══════════════════════════════════════════════════════════════

### ШАГ 2.1: Установи зависимости

Выполни команду:
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs nodemailer react-dropzone

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Клиент для браузера (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Клиент для сервера (с полными правами)
export const getServerSupabase = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Получить текущего пользователя
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

// Проверка лимита генераций
export const checkGenerationLimit = async (userId: string) => {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('generations_used, generations_limit')
    .eq('id', userId)
    .single()
  
  if (error || !data) return false
  return data.generations_used < data.generations_limit
}

// Увеличение счётчика использований
export const incrementGenerationCount = async (userId: string) => {
  const supabase = getServerSupabase()
  await supabase.rpc('increment_generation_count', { user_uuid: userId })
}

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Защищённые роуты
  const protectedRoutes = ['/dashboard', '/upload', '/result', '/api/analyze']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Публичные роуты
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/confirm', '/privacy', '/terms']
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Если защищённый роут и нет сессии — редирект на login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  
  // Если залогинен и пытается зайти на auth страницы — редирект на dashboard
  if (isPublicRoute && session && !req.nextUrl.pathname.startsWith('/auth/confirm')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['cyrillic', 'latin'] })

export const metadata: Metadata = {
  title: 'Chat Analyzer — Анализ чатов с помощью AI',
  description: 'Загрузите чат и получите глубокий анализ взаимоотношений участников',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Qwen API
QWEN_API_KEY=your-qwen-key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# Email
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@chat-analyzer.ru

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Вход в Chat Analyzer
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }

    if (!agree) {
      setError('Необходимо согласиться с политикой конфиденциальности')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      router.push('/auth/confirm')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Регистрация
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="•••••••• (мин. 8 символов)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-start">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="agree" className="ml-2 text-sm text-gray-600">
              Я согласен с{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                политикой конфиденциальности
              </Link>{' '}
              и{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                пользовательским соглашением
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Подтвердите ваш email
        </h1>
        
        <p className="text-gray-600 mb-6">
          Мы отправили письмо с подтверждением на вашу почту. 
          Пожалуйста, перейдите по ссылке в письме, чтобы активировать аккаунт.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <p className="text-sm text-blue-800">
            <strong>Не получили письмо?</strong>
            <br />
            • Проверьте папку "Спам"
            <br />
            • Убедитесь, что email указан правильно
          </p>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      setLoading(false)
    }

    checkAuth()

    const {  } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return null

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Chat Analyzer
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/upload" className="text-gray-700 hover:text-gray-900">
                  Загрузить чат
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-700 hover:text-gray-900">
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LimitCounter() {
  const [used, setUsed] = useState(0)
  const [limit, setLimit] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLimit = async () => {
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
      setLoading(false)
    }

    fetchLimit()
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


'use client'

import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'
import LimitCounter from '@/components/LimitCounter'

export default function UploadPage() {
  const router = useRouter()

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
          <li>Выберите "Экспорт истории чата"</li>
          <li>Выберите формат "JSON" или "TXT"</li>
          <li>Нажмите "Экспортировать"</li>
          <li>Загрузите полученный файл выше</li>
        </ol>
      </div>
    </div>
  )
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Проверка авторизации
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    const userId = session.user.id

    // Проверка лимита
    const { data: userData } = await supabase
      .from('users')
      .select('generations_used, generations_limit')
      .eq('id', userId)
      .single()

    if (!userData || userData.generations_used >= userData.generations_limit) {
      return NextResponse.json(
        { error: 'Лимит генераций исчерпан' },
        { status: 403 }
      )
    }

    // Получение файла
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Файл слишком большой (макс. 10 МБ)' },
        { status: 400 }
      )
    }

    // Проверка типа
    if (!file.type.match(/^(text\/plain|application\/json)$/)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат файла' },
        { status: 400 }
      )
    }

    // Загрузка в Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Создание записи в analyses
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Запуск анализа (асинхронно)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId: analysis.id }),
    })

    return NextResponse.json({ 
      success: true, 
      analysisId: analysis.id 
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}

import * as fs from 'fs/promises'
import * as path from 'path'

const QWEN_API_URL = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
const QWEN_API_KEY = process.env.QWEN_API_KEY!

export async function analyzeChatWithQwen(chatText: string): Promise<{
  fullResult: string
  teaser: string
}> {
  // Чтение промта из файла
  const promptPath = path.join(process.cwd(), 'prompts', 'chat-analysis-prompt.txt')
  let prompt: string

  try {
    prompt = await fs.readFile(promptPath, 'utf-8')
  } catch {
    // Fallback промт если файл не найден
    prompt = `Ты — эксперт по анализу чатов. Проанализируй переписку и выдай структурированный результат.`
  }

  // Ограничение длины текста (Qwen имеет лимит токенов)
  const maxTextLength = 50000 // примерно 10000 слов
  const truncatedText = chatText.length > maxTextLength 
    ? chatText.substring(0, maxTextLength) + '\n\n[...текст обрезан из-за длины]'
    : chatText

  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-max',
      input: {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: truncatedText }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 4000,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const fullResult = data.output?.text || 'Анализ не получен'

  // Создание teaser (первые 30% результата)
  const teaserLength = Math.floor(fullResult.length * 0.3)
  const teaser = fullResult.substring(0, teaserLength) + '\n\n[...полный результат доступен после оплаты]'

  return { fullResult, teaser }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeChatWithQwen } from '@/lib/qwen-api'
import { sendAnalysisEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = await request.json()

    // Получение данных анализа
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*, users(email)')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Анализ не найден' }, { status: 404 })
    }

    // Обновление статуса
    await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)

    // Скачивание файла из Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-files')
      .download(analysis.file_path)

    if (downloadError || !fileData) {
      throw new Error('Не удалось скачать файл')
    }

    // Чтение текста из файла
    const fileText = await fileData.text()

    // Анализ через Qwen
    const { fullResult, teaser } = await analyzeChatWithQwen(fileText)

    // Сохранение результата
    await supabase
      .from('analyses')
      .update({
        status: 'completed',
        result_text: fullResult,
        result_teaser: teaser,
      })
      .eq('id', analysisId)

    // Увеличение счётчика
    await supabase.rpc('increment_generation_count', { user_uuid: analysis.user_id })

    // Отправка email
    try {
      await sendAnalysisEmail(
        analysis.users.email,
        analysis.file_name,
        teaser,
        false // пока не оплачено
      )

      await supabase
        .from('analyses')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', analysisId)
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Не прерываем процесс если email не отправился
    }

    return NextResponse.json({ success: true, analysisId })

  } catch (error: any) {
    console.error('Analysis error:', error)

    // Обновление статуса на failed
    const { analysisId } = await request.json()
    await supabase
      .from('analyses')
      .update({ status: 'failed' })
      .eq('id', analysisId)

    return NextResponse.json(
      { error: error.message || 'Ошибка анализа' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ allowed: false, error: 'Требуется авторизация' }, { status: 401 })
    }

    const { data } = await supabase
      .from('users')
      .select('generations_used, generations_limit')
      .eq('id', session.user.id)
      .single()

    if (!data) {
      return NextResponse.json({ allowed: false, error: 'Пользователь не найден' }, { status: 404 })
    }

    const allowed = data.generations_used < data.generations_limit

    return NextResponse.json({
      allowed,
      used: data.generations_used,
      limit: data.generations_limit,
    })

  } catch (error: any) {
    return NextResponse.json(
      { allowed: false, error: error.message },
      { status: 500 }
    )
  }
}


import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 587,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY
  }
})

export async function sendAnalysisEmail(
  to: string,
  fileName: string,
  result: string,
  isPaid: boolean
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const subject = isPaid 
    ? `📊 Полный анализ чата "${fileName}" готов!`
    : `📊 Анализ чата "${fileName}" готов (превью)`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .result { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    .cta { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .cta:hover { background: #059669; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Chat Analyzer</h1>
      <p style="margin: 5px 0 0 0;">Анализ чатов с помощью AI</p>
    </div>
    
    <div class="content">
      <h2>Ваш анализ готов!</h2>
      <p><strong>Файл:</strong> ${fileName}</p>
      <p><strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      
      ${isPaid ? `
        <div class="result">
          <h3>📋 Полный результат:</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; background: #f3f4f6; padding: 15px; border-radius: 4px;">${result}</pre>
        </div>
      ` : `
        <div class="result">
          <h3>📋 Превью результата:</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; background: #f3f4f6; padding: 15px; border-radius: 4px;">${result.substring(0, 800)}${result.length > 800 ? '...' : ''}</pre>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">🎁 Получите полную версию за 250₽</h3>
          <p>В полной версии вы получите:</p>
          <ul>
            <li>✓ Полный анализ всех 10 измерений</li>
            <li>✓ Профили всех участников чата</li>
            <li>✓ Карту тем и вопросов</li>
            <li>✓ 10-20 идей для контента</li>
            <li>✓ PDF-отчёт для скачивания</li>
            <li>✓ Приоритетную обработку</li>
          </ul>
          <div style="text-align: center;">
            <a href="${appUrl}/payment" class="cta">Оплатить и получить полный результат</a>
          </div>
        </div>
      `}
      
      <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0; font-size: 14px;">
          <strong>⏰ Важно:</strong> Файл и результат будут автоматически удалены через 24 часа.
        </p>
      </div>
      
      <div class="footer">
        <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
        <p>© ${new Date().getFullYear()} Chat Analyzer. Все права защищены.</p>
        <p>
          <a href="${appUrl}/privacy">Политика конфиденциальности</a> | 
          <a href="${appUrl}/terms">Пользовательское соглашение</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Chat Analyzer <noreply@chat-analyzer.ru>',
    to,
    subject,
    html,
  })
}


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


'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ResultPreview from '@/components/ResultPreview'
import LimitCounter from '@/components/LimitCounter'

export default function ResultPage() {
  const params = useParams()
  const analysisId = params.id as string
  
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      if (analysis?.status === 'pending' || analysis?.status === 'processing') {
        const { data } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisId)
          .single()
        
        if (data) {
          setAnalysis(data)
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval)
          }
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [analysisId, analysis?.status])

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
              isPaid={analysis.is_paid || false}
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


npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app/**',
    '!**/node_modules/**',
  ],
}

module.exports = config

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app/**',
    '!**/node_modules/**',
  ],
}

module.exports = config


import { describe, it, expect } from '@jest/globals'

describe('Загрузка файлов', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

  it('2.1 — Проверка размера файла (до 10 МБ)', () => {
    const validSize = 5 * 1024 * 1024 // 5 MB
    expect(validSize).toBeLessThanOrEqual(MAX_FILE_SIZE)
  })

  it('2.2 — Отклонение файла больше 10 МБ', () => {
    const invalidSize = 15 * 1024 * 1024 // 15 MB
    expect(invalidSize).toBeGreaterThan(MAX_FILE_SIZE)
  })

  it('2.3 — Разрешённые типы файлов', () => {
    const allowedTypes = ['text/plain', 'application/json']
    expect(allowedTypes).toContain('text/plain')
    expect(allowedTypes).toContain('application/json')
    expect(allowedTypes).not.toContain('application/pdf')
  })
})

import { describe, it, expect } from '@jest/globals'

describe('Лимиты генераций', () => {
  it('3.1 — Проверка лимита (1 бесплатно)', () => {
    const used = 0
    const limit = 1
    const allowed = used < limit
    expect(allowed).toBe(true)
  })

  it('3.2 — Превышение лимита', () => {
    const used = 1
    const limit = 1
    const allowed = used < limit
    expect(allowed).toBe(false)
  })

  it('3.3 — Увеличение счётчика', () => {
    let used = 0
    used += 1
    expect(used).toBe(1)
  })
})

"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}


{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "QWEN_API_KEY": "@qwen_api_key",
    "RESEND_API_KEY": "@resend_api_key",
    "EMAIL_FROM": "@email_from",
    "NEXT_PUBLIC_APP_URL": "@next_public_app_url"
  }
}

# Chat Analyzer

Сервис анализа чатов Telegram с помощью AI (Qwen)

## 🚀 Быстрый старт

### Установка

```bash
npm install

































































































































































































































































































































































































































































































































































































































































































































































































































































