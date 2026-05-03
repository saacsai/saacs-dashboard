'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ConfirmarPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const pid = params.get('pid')

    if (!code) {
      window.location.href = '/login'
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        window.location.href = '/login?erro=link-invalido'
        return
      }
      window.location.href = pid ? `/tilapia?pid=${pid}` : '/tilapia'
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Verificando acesso…</p>
    </div>
  )
}
