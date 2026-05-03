'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import TilapiaWorkspace from './TilapiaWorkspace'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface Session {
  projectId: string
  token: string
  oauthClientId: string
}

function TilapiaPage() {
  const params = useSearchParams()
  const pid = params.get('pid') || ''
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function init() {
      // 1. Tenta restaurar sessão existente (compatibilidade)
      if (pid) {
        const saved = sessionStorage.getItem(`tilapia_session_${pid}`)
        if (saved) {
          try {
            setSession(JSON.parse(saved))
            setLoading(false)
            return
          } catch { /* ignore */ }
        }
      }

      // 2. Verifica sessão Supabase Auth
      const supabase = getSupabase()
      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession) {
        // Sem sessão → redireciona para login
        window.location.href = pid ? `/login?pid=${pid}` : '/login'
        return
      }

      // 3. Com sessão Auth, busca projetos do usuário por email
      const email = authSession.user.email
      if (!email) { setErro('Email não encontrado na sessão.'); setLoading(false); return }

      // Se tem pid na URL, usa diretamente
      const projectId = pid || await getFirstProjectId(email)
      if (!projectId) {
        setErro('Nenhum projeto encontrado para este usuário.')
        setLoading(false)
        return
      }

      // 4. Obtém token MCP para o projeto
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: projectId, email }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.error || 'Erro ao autenticar.'); setLoading(false); return }

      const s: Session = { projectId, token: json.access_token, oauthClientId: json.oauth_client_id }
      sessionStorage.setItem(`tilapia_session_${projectId}`, JSON.stringify(s))
      setSession(s)
      setLoading(false)
    }

    init()
  }, [pid])

  async function getFirstProjectId(email: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/auth/projetos?email=${encodeURIComponent(email)}`)
      const json = await res.json()
      return json.projects?.[0]?.id ?? null
    } catch { return null }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Carregando…
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <p className="text-sm text-red-600 mb-4">{erro}</p>
        <a href="/login" className="text-sm text-[#1E3A6E] hover:underline">Voltar ao login</a>
      </div>
    </div>
  )

  if (session) return <TilapiaWorkspace projectId={session.projectId} token={session.token} />

  return null
}

export default function TilapiaPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Carregando…</div>}>
      <TilapiaPage />
    </Suspense>
  )
}
