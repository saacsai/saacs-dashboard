'use client'

import { useState } from 'react'

interface Props {
  plano: string
  token: string
  onVoltar: () => void
}

const PLANOS = [
  {
    id: 'free',
    label: 'Gratuito',
    preco: 'R$ 0',
    detalhe: 'Para começar',
    projetos: 'Até 3 projetos',
    gestao: false,
  },
  {
    id: 'standard',
    label: 'Standard',
    preco: 'A partir de R$ 189/mês',
    detalhe: 'Mais popular',
    projetos: 'Até 10 projetos',
    gestao: true,
    destaque: true,
  },
  {
    id: 'paid_pro',
    label: 'Pro',
    preco: 'A partir de R$ 189/mês',
    detalhe: 'Para equipes maiores',
    projetos: 'Até 20 projetos',
    gestao: true,
  },
  {
    id: 'corporate',
    label: 'Corporate',
    preco: 'Sob consulta',
    detalhe: 'Múltiplos usuários',
    projetos: 'Projetos ilimitados',
    gestao: true,
  },
]

const OPCOES_PAGAMENTO = [
  { id: 'mensal',    label: 'Mensal',          preco: 'R$ 239/mês',   detalhe: 'Cancele quando quiser' },
  { id: 'parcelado', label: '12x de R$ 189',   preco: 'R$ 189/mês',   detalhe: 'por 12 meses — total R$ 2.268', destaque: true },
  { id: 'anual',     label: 'Anual à vista',   preco: 'R$ 1.879',     detalhe: '≈ R$ 157/mês — 34% de desconto' },
]

const INCLUSOS = [
  'Cronograma mês a mês com alocação de equipe',
  'Gestão dinâmica de sprints semanais',
  'Notion integrado em tempo real',
  'Relatórios periódicos de andamento',
  'Projetos ilimitados no limite do plano',
]

const PLANO_PAGO = ['standard', 'corporate', 'paid_pro']

export default function GerenciarPlanoPage({ plano, token, onVoltar }: Props) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState('parcelado')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const isPago = PLANO_PAGO.includes(plano)

  async function handleUpgrade() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: opcaoSelecionada }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.error || `Erro ${res.status}`); return }
      if (json.url) window.location.href = json.url
      else setErro(json.error || 'URL não retornada.')
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Planos</h1>
      </div>

      {/* Cards de planos */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {PLANOS.map(p => {
          const ativo = p.id === plano || (p.id === 'standard' && plano === 'standard')
          return (
            <div
              key={p.id}
              className={`rounded-xl border-2 p-5 relative ${
                ativo ? 'border-[#1E3A6E] bg-[#1E3A6E]/5' : 'border-gray-200'
              } ${p.id === 'corporate' ? 'col-span-2' : ''}`}
            >
              {p.destaque && !ativo && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold bg-[#1E3A6E] text-white px-2 py-0.5 rounded-full">
                  mais popular
                </span>
              )}
              {ativo && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✓ Plano atual
                </span>
              )}
              <div className="font-semibold text-gray-900 text-base mb-0.5">{p.label}</div>
              <div className="text-xs text-gray-500 mb-3">{p.projetos}</div>
              <div className="text-sm font-medium text-gray-800">{p.preco}</div>
              <div className="text-xs text-gray-400 mt-0.5">{p.detalhe}</div>
              {p.gestao ? (
                <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                  <span>✓</span> Gestão com cronograma inclusa
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-400">Sem gestão com cronograma</div>
              )}
              {p.id === 'corporate' && (
                <a href="mailto:contato@saacs.com.br" className="mt-3 inline-block text-xs text-[#1E3A6E] hover:underline">
                  Fale com a equipe →
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* O que está incluso */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">O que está incluso nos planos pagos:</p>
        <ul className="space-y-2">
          {INCLUSOS.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 mt-0.5">✓</span> {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade — só para quem não tem plano pago */}
      {!isPago && (
        <div className="border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Escolha como pagar o Standard:</p>
          <div className="space-y-2 mb-4">
            {OPCOES_PAGAMENTO.map(op => (
              <button
                key={op.id}
                onClick={() => setOpcaoSelecionada(op.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors relative ${
                  opcaoSelecionada === op.id ? 'border-[#1E3A6E] bg-[#1E3A6E]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {op.destaque && (
                  <span className="absolute top-2 right-3 text-[10px] font-semibold bg-[#1E3A6E] text-white px-1.5 py-0.5 rounded-full">
                    mais popular
                  </span>
                )}
                <div className="font-semibold text-sm text-gray-900">{op.preco}</div>
                <div className="text-xs text-gray-500 mt-0.5">{op.detalhe}</div>
              </button>
            ))}
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">{erro}</p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full text-center text-sm font-medium bg-[#1E3A6E] text-white rounded-xl py-3 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Aguarde…' : 'Continuar para pagamento →'}
          </button>
        </div>
      )}

      {isPago && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center">
          ✓ Você já tem um plano ativo. Para alterar ou cancelar, acesse{' '}
          <a href="mailto:contato@saacs.com.br" className="underline">contato@saacs.com.br</a>.
        </div>
      )}
    </div>
  )
}
