import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  if (pathname.startsWith('/tilapia')) {
    // Verifica cookie de sessão do Supabase
    const hasSession = req.cookies.getAll().some(c =>
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )
    // Mantém compatibilidade com sessionStorage (não detectável no server) —
    // deixa passar e o client-side redireciona se necessário
    if (!hasSession) {
      const pid = searchParams.get('pid')
      const loginUrl = new URL('/login', req.url)
      if (pid) loginUrl.searchParams.set('pid', pid)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/tilapia'],
}
