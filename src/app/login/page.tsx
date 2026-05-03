'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'senha' | 'magic'>('senha')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [pid, setPid] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pidParam = params.get('pid')
    setPid(pidParam)

    // Se veio com pid, busca o email do cliente e envia magic link automaticamente
    if (pidParam) {
      setModo('magic')
      fetch(`/api/auth/email?pid=${pidParam}`)
        .then(r => r.json())
        .then(d => {
          if (d.email) {
            setEmail(d.email)
            enviarMagicLink(d.email, pidParam)
          }
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enviarMagicLink(emailAlvo: string, pidAlvo?: string | null) {
    setLoading(true)
    setErro('')
    const supabase = getSupabase()
    const redirectTo = `${window.location.origin}/auth/callback${pidAlvo ? `?pid=${pidAlvo}` : ''}`
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAlvo,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) setErro(error.message)
    else setMensagem(`Link de acesso enviado para ${emailAlvo}. Verifique seu email.`)
    setLoading(false)
  }

  async function handleLoginSenha(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }
    window.location.href = pid ? `/tilapia?pid=${pid}` : '/tilapia'
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    await enviarMagicLink(email, pid)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/tilapia_standard.jpg" alt="TILAPIA Standard" width={140} height={140} className="rounded-xl" priority />
        </div>

        {mensagem ? (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Verifique seu email</p>
            <p className="text-sm text-gray-500">{mensagem}</p>
            <button
              onClick={() => setMensagem('')}
              className="text-xs text-[#1E3A6E] hover:underline mt-2"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Acessar dashboard</h1>
            <p className="text-sm text-gray-500 mb-6">
              {modo === 'senha' ? 'Entre com seu email e senha.' : 'Receba um link de acesso por email.'}
            </p>

            {modo === 'senha' ? (
              <form onSubmit={handleLoginSenha} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
                  <input
                    type="password" value={senha} onChange={e => setSenha(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20"
                  />
                </div>
                {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{erro}</p>}
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-[#1E3A6E] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20"
                  />
                </div>
                {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{erro}</p>}
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-[#1E3A6E] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enviando…' : 'Enviar link de acesso'}
                </button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                onClick={() => { setModo(m => m === 'senha' ? 'magic' : 'senha'); setErro('') }}
                className="text-xs text-gray-500 hover:text-[#1E3A6E] transition-colors"
              >
                {modo === 'senha' ? 'Prefere receber um link por email?' : 'Entrar com senha'}
              </button>
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <Image src="/logo_saacs.png" alt="SAACS" width={80} height={25} className="object-contain opacity-40" />
        </div>
      </div>
    </div>
  )
}
