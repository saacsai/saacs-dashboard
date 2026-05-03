'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('pid')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Supabase JS detecta automaticamente o code/hash na URL e troca pela sessão
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        // Tenta exchangeCodeForSession explicitamente como fallback
        const code = params.get('code')
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
            if (err) {
              window.location.href = '/login?erro=link-invalido'
            } else {
              window.location.href = pid ? `/tilapia?pid=${pid}` : '/tilapia'
            }
          })
        } else {
          window.location.href = '/login?erro=link-invalido'
        }
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
