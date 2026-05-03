'use client'

import { useState } from 'react'

interface Props {
  plano: string
  token: string
  onVoltar: () => void
}

const PLANOS_OPCOES = [
  {
    id: 'standard',
    label: 'Standard',
    projetos: 'Até 10 projetos',
    destaque: false,
  },
  {
    id: 'pro',
    label: 'Pro',
    projetos: 'Até 20 projetos',
    destaque: true,
  },
]

const CICLOS: Record<string, Array<{ id: string; label: string; valor: string; equivalente: string; custoProjeto: string; detalhe: string }>> = {
  standard: [
    { id: 'standard_mensal',     label: 'Mensal',     valor: 'R$ 237/mês',   equivalente: 'R$ 237/mês',  custoProjeto: 'R$ 23,70/projeto', detalhe: 'Cancele quando quiser' },
    { id: 'standard_trimestral', label: 'Trimestral', valor: 'R$ 597/trim',  equivalente: 'R$ 199/mês',  custoProjeto: 'R$ 19,90/projeto', detalhe: 'Cobrado a cada 3 meses' },
    { id: 'standard_anual',      label: 'Anual',      valor: 'R$ 1.897/ano', equivalente: 'R$ 158/mês',  custoProjeto: 'R$ 15,81/projeto', detalhe: 'Cobrado uma vez por ano' },
  ],
  pro: [
    { id: 'pro_mensal',          label: 'Mensal',     valor: 'R$ 357/mês',   equivalente: 'R$ 357/mês',  custoProjeto: 'R$ 17,85/projeto', detalhe: 'Cancele quando quiser' },
    { id: 'pro_trimestral',      label: 'Trimestral', valor: 'R$ 827/trim',  equivalente: 'R$ 276/mês',  custoProjeto: 'R$ 13,78/projeto', detalhe: 'Cobrado a cada 3 meses' },
    { id: 'pro_anual',           label: 'Anual',      valor: 'R$ 2.297/ano', equivalente: 'R$ 191/mês',  custoProjeto: 'R$ 9,57/projeto',  detalhe: 'Cobrado uma vez por ano' },
  ],
}

const INCLUSOS = [
  'Cronograma mês a mês com alocação de equipe',
  'Gestão dinâmica de sprints semanais',
  'Notion integrado em tempo real',
  'Relatórios periódicos de andamento',
]

const PLANO_PAGO = ['standard', 'corporate', 'paid_pro']

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

export default function GerenciarPlanoPage({ plano, token, onVoltar }: Props) {
  const isPago = PLANO_PAGO.includes(plano)
  const [etapa, setEtapa] = useState<'plano' | 'ciclo'>('plano')
  const [planoSelecionado, setPlanoSelecionado] = useState<'standard' | 'pro'>('standard')
  const [cicloSelecionado, setCicloSelecionado] = useState('standard_mensal')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: cicloSelecionado }),
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

  function selecionarPlano(id: 'standard' | 'pro') {
    setPlanoSelecionado(id)
    setCicloSelecionado(`${id}_mensal`)
    setEtapa('ciclo')
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={etapa === 'ciclo' ? () => setEtapa('plano') : onVoltar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <IconBack />
          Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">
          {etapa === 'plano' ? 'Planos' : `${planoSelecionado === 'standard' ? 'Standard' : 'Pro'} — escolha o ciclo`}
        </h1>
      </div>

      {/* Plano atual ativo */}
      {isPago && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <span>✓</span>
          <span>Você já tem um plano ativo. Para alterar, entre em contato: <a href="mailto:contato@saacs.com.br" className="underline">contato@saacs.com.br</a></span>
        </div>
      )}

      {/* ETAPA 1 — Escolher plano */}
      {etapa === 'plano' && (
        <>
          {/* O que está incluso */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Incluso em todos os planos pagos</p>
            <ul className="space-y-1.5">
              {INCLUSOS.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {PLANOS_OPCOES.map(p => {
              const ativoAtual = (plano === p.id) || (plano === 'paid_pro' && p.id === 'pro')
              return (
                <button
                  key={p.id}
                  onClick={() => !isPago && selecionarPlano(p.id as 'standard' | 'pro')}
                  disabled={isPago}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors relative ${
                    ativoAtual
                      ? 'border-green-400 bg-green-50 cursor-default'
                      : isPago
                      ? 'border-gray-200 opacity-60 cursor-default'
                      : 'border-gray-200 hover:border-[#1E3A6E] hover:bg-[#1E3A6E]/5 cursor-pointer'
                  }`}
                >
                  {p.destaque && !ativoAtual && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold bg-[#1E3A6E] text-white px-2 py-0.5 rounded-full">
                      mais popular
                    </span>
                  )}
                  {ativoAtual && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full">
                      ✓ ativo
                    </span>
                  )}
                  <div className="font-semibold text-gray-900">{p.label}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{p.projetos}</div>
                  {!isPago && (
                    <div className="text-xs text-[#1E3A6E] mt-2">Ver opções de pagamento →</div>
                  )}
                </button>
              )
            })}

            {/* Corporate */}
            <div className="px-5 py-4 rounded-xl border-2 border-dashed border-gray-200">
              <div className="font-semibold text-gray-900">Corporate</div>
              <div className="text-sm text-gray-500 mt-0.5">Projetos ilimitados · múltiplos usuários</div>
              <a href="mailto:contato@saacs.com.br" className="text-xs text-[#1E3A6E] mt-2 inline-block hover:underline">
                Fale com a equipe →
              </a>
            </div>
          </div>

          {/* Gratuito */}
          <p className="text-xs text-gray-400 text-center mt-5">
            Plano Gratuito inclui até 3 projetos, sem gestão com cronograma.
          </p>
        </>
      )}

      {/* ETAPA 2 — Escolher ciclo */}
      {etapa === 'ciclo' && (
        <>
          <div className="space-y-3 mb-5">
            {CICLOS[planoSelecionado].map(op => (
              <button
                key={op.id}
                onClick={() => setCicloSelecionado(op.id)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors relative ${
                  cicloSelecionado === op.id
                    ? 'border-[#1E3A6E] bg-[#1E3A6E]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{op.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{op.detalhe}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">{op.valor}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{op.equivalente}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs font-medium text-[#1E3A6E]">
                  {op.custoProjeto} · {planoSelecionado === 'standard' ? '10 projetos' : '20 projetos'}
                </div>
              </button>
            ))}
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{erro}</p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full text-center text-sm font-medium bg-[#1E3A6E] text-white rounded-xl py-3 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Aguarde…' : 'Continuar para pagamento →'}
          </button>
        </>
      )}
    </div>
  )
}
