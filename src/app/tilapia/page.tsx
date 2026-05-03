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
        setErro('sem_projeto')
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

  if (erro === 'sem_projeto') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#1C4586' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">Nenhum projeto ainda</h2>
        <p className="text-sm text-gray-500 mb-3">
          Para acessar o dashboard, você precisa iniciar sua jornada TILAPIA preenchendo o formulário de diagnóstico.
        </p>
        <p className="text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2 mb-6">
          Use o mesmo email desta conta no formulário para que o projeto seja vinculado automaticamente.
        </p>
        <a
          href="https://saacs.com.br/metodologia-tilapia/tilapia-standard/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-white text-sm font-medium rounded-xl py-2.5 mb-3 transition-colors"
          style={{ backgroundColor: '#1C4586' }}
        >
          Iniciar jornada TILAPIA
        </a>
        <button
          onClick={async () => {
            const { createClient } = await import('@supabase/supabase-js')
            const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
            await sb.auth.signOut()
            window.location.href = '/login'
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <p className="text-sm text-red-600 mb-4">{erro}</p>
        <a href="/login" className="text-sm hover:underline" style={{ color: '#1C4586' }}>Voltar ao login</a>
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
