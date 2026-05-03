import { NextRequest, NextResponse } from 'next/server'

// Repassa para página client que troca o code pelo token no browser
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const pid = searchParams.get('pid')

  const dest = new URL('/auth/confirmar', origin)
  if (code) dest.searchParams.set('code', code)
  if (pid) dest.searchParams.set('pid', pid)

  return NextResponse.redirect(dest)
}
