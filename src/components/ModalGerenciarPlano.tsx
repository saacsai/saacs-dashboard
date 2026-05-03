'use client'

import { useState } from 'react'

interface Props {
  plano: string
  token: string
  onClose: () => void
}

const OPCOES = [
  {
    id: 'mensal',
    label: 'Mensal',
    preco: 'R$ 239/mês',
    detalhe: 'Cancele quando quiser',
    destaque: false,
  },
  {
    id: 'parcelado',
    label: '12x de R$ 189',
    preco: 'R$ 189/mês',
    detalhe: 'por 12 meses — total R$ 2.268',
    destaque: true,
  },
  {
    id: 'anual',
    label: 'Anual à vista',
    preco: 'R$ 1.879',
    detalhe: '≈ R$ 157/mês — 34% de desconto',
    destaque: false,
  },
]

const INCLUSOS = [
  'Projetos ilimitados',
  'Cronograma dinâmico mês a mês',
  'Notion + sprints semanais',
  'Gestão em tempo real',
  'Relatórios periódicos',
]

export default function ModalGerenciarPlano({ plano, token, onClose }: Props) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string>('parcelado')
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [erroCheckout, setErroCheckout] = useState('')
  const isPago = ['standard', 'corporate', 'paid_pro'].includes(plano)

  async function handleUpgrade() {
    setLoadingCheckout(true)
    setErroCheckout('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: opcaoSelecionada }),
      })
      const text = await res.text()
      if (!res.ok) { setErroCheckout(`Erro ${res.status}: ${text.slice(0, 300)}`); return }
      const json = JSON.parse(text)
      if (json.url) window.location.href = json.url
      else setErroCheckout(json.error || 'URL não retornada.')
    } catch (e) {
      setErroCheckout(String(e))
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isPago ? 'Seu plano atual' : 'Fazer upgrade para Standard'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* O que está incluso */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">O que está incluso no Standard:</p>
            <ul className="space-y-1">
              {INCLUSOS.map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-500 text-xs">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Opções de pagamento */}
          {!isPago && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Escolha como pagar:</p>
              {OPCOES.map(op => (
                <button
                  key={op.id}
                  onClick={() => setOpcaoSelecionada(op.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors relative
                    ${opcaoSelecionada === op.id ? 'border-[#1E3A6E] bg-[#1E3A6E]/5' : 'border-gray-200 hover:border-gray-300'}`}
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
          )}

          {isPago && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
              ✅ Você já tem o plano Standard ativo.
            </div>
          )}

          {erroCheckout && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{erroCheckout}</p>
          )}
        </div>

        <div className="px-6 pb-4 space-y-2">
          {!isPago && (
            <button
              onClick={handleUpgrade}
              disabled={loadingCheckout}
              className="w-full text-center text-sm font-medium bg-[#1E3A6E] text-white rounded-xl py-3 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
            >
              {loadingCheckout ? 'Aguarde…' : 'Continuar para pagamento →'}
            </button>
          )}

          <p className="text-center text-xs text-gray-400">
            Plano Corporate (múltiplos usuários):{' '}
            <a href="mailto:contato@saacs.com.br" className="text-[#1E3A6E] hover:underline">contato@saacs.com.br</a>
          </p>

          <div className="flex justify-center">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
