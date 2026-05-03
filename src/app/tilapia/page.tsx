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

interface Projeto {
  id: string
  tipo: string
  mise_en_place_concluido: boolean
}

const TIPO_LABEL: Record<string, string> = {
  novo_projeto: 'Novo Projeto',
  novo_projeto_edital: 'Projeto por Edital',
  validar_projeto_pronto: 'Projeto Pronto',
}

function SelecionarProjeto({ projetos, onSelecionar }: { projetos: Projeto[], onSelecionar: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full">
        <h1 className="text-base font-bold text-gray-900 mb-1">Seus projetos</h1>
        <p className="text-sm text-gray-500 mb-6">Selecione qual projeto deseja abrir.</p>
        <div className="space-y-3">
          {projetos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelecionar(p.id)}
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:border-[#1E3A6E] hover:bg-[#1E3A6E]/5 transition-colors text-left group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Projeto {i + 1}</p>
                <p className="text-xs text-gray-500 mt-0.5">{TIPO_LABEL[p.tipo] ?? p.tipo}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-[#1E3A6E]">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TilapiaPage() {
  const params = useSearchParams()
  const pid = params.get('pid') || ''
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [projetos, setProjetos] = useState<Projeto[] | null>(null)
  const [email, setEmail] = useState('')

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
        window.location.href = pid ? `/login?pid=${pid}` : '/login'
        return
      }

      const userEmail = authSession.user.email
      if (!userEmail) { setErro('Email não encontrado na sessão.'); setLoading(false); return }
      setEmail(userEmail)

      // 3. Se tem pid na URL, usa diretamente
      if (pid) {
        await abrirProjeto(pid, userEmail)
        return
      }

      // 4. Busca todos os projetos do usuário
      const res = await fetch(`/api/auth/projetos?email=${encodeURIComponent(userEmail)}`)
      const json = await res.json()
      const lista: Projeto[] = json.projects ?? []

      if (lista.length === 0) {
        setErro('Nenhum projeto encontrado para este usuário.')
        setLoading(false)
        return
      }

      if (lista.length === 1) {
        await abrirProjeto(lista[0].id, userEmail)
        return
      }

      // 5. Mais de um projeto → mostra seleção
      setProjetos(lista)
      setLoading(false)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid])

  async function abrirProjeto(projectId: string, userEmail: string) {
    setLoading(true)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: projectId, email: userEmail }),
    })
    const json = await res.json()
    if (!res.ok) { setErro(json.error || 'Erro ao autenticar.'); setLoading(false); return }

    const s: Session = { projectId, token: json.access_token, oauthClientId: json.oauth_client_id }
    sessionStorage.setItem(`tilapia_session_${projectId}`, JSON.stringify(s))
    setSession(s)
    setLoading(false)
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

  if (projetos) return (
    <SelecionarProjeto
      projetos={projetos}
      onSelecionar={(id) => abrirProjeto(id, email)}
    />
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
