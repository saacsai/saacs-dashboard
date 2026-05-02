'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TilapiaWorkspace from './TilapiaWorkspace'

function formatCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function TilapiaPage() {
  const params = useSearchParams()
  const pid = params.get('pid') || ''
  const [cpf, setCpf] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<{
    projectId: string
    token: string
    oauthClientId: string
  } | null>(null)

  useEffect(() => {
    // Restaura sessão se já autenticado neste projeto
    const saved = sessionStorage.getItem(`tilapia_session_${pid}`)
    if (saved) {
      try { setSession(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [pid])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!pid) { setError('Link inválido — falta o ID do projeto.'); return }

    const cpfNum = cpf.replace(/\D/g, '')
    if (cpfNum.length !== 11) { setError('CPF inválido.'); return }

    setLoading(true)
    setError('')

    try {
      // Validar CPF + project_id no Supabase
      const { data, error: sbErr } = await supabase
        .from('tlp_projetos')
        .select('id, oauth_client_id, oauth_client_secret')
        .eq('id', pid)
        .single()

      if (sbErr || !data) {
        setError('Projeto não encontrado.')
        return
      }

      // Verificar CPF na tabela clients
      const { data: clientData } = await supabase
        .from('clients')
        .select('cpf')
        .eq('id', (await supabase.from('tlp_projetos').select('client_id').eq('id', pid).single()).data?.client_id)
        .single()

      const cpfCadastrado = clientData?.cpf?.replace(/\D/g, '')
      if (cpfCadastrado && cpfCadastrado !== cpfNum) {
        setError('CPF não corresponde ao projeto.')
        return
      }

      // Gerar token via OAuth client_credentials
      const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br'}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: data.oauth_client_id,
          client_secret: data.oauth_client_secret,
        }),
      })

      if (!tokenRes.ok) {
        setError('Erro de autenticação. Tente novamente.')
        return
      }

      const { access_token } = await tokenRes.json()
      const sessionData = { projectId: pid, token: access_token, oauthClientId: data.oauth_client_id }
      sessionStorage.setItem(`tilapia_session_${pid}`, JSON.stringify(sessionData))
      setSession(sessionData)

    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return <TilapiaWorkspace projectId={session.projectId} token={session.token} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-gray-900 mb-1">SAACS</div>
          <div className="text-sm text-gray-500">Mise en place do projeto</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seu CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={e => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pid}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sem senha. Sem cadastro. Só o CPF que você usou ao criar o projeto.
        </p>
      </div>
    </div>
  )
}

export default function TilapiaPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Carregando…</div>}>
      <TilapiaPage />
    </Suspense>
  )
}
