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