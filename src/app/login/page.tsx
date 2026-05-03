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

  async function handleGoogle() {
    setLoading(true)
    setErro('')
    const supabase = getSupabase()
    const redirectTo = `${window.location.origin}/auth/callback${pid ? `?pid=${pid}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) { setErro(error.message); setLoading(false) }
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

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Entrar com Google
            </button>

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
