'use client'

interface Props {
  plano: string
  onClose: () => void
}

const UPGRADE_URL = process.env.NEXT_PUBLIC_UPGRADE_URL || 'https://saacs.com.br/upgrade'

const PLANOS = [
  {
    id: 'free',
    nome: 'Gratuito',
    preco: null,
    itens: [
      '3 projetos',
      'Mise en place completo',
      'Plano de Trabalho em Word',
    ],
    cta: null,
  },
  {
    id: 'standard',
    nome: 'Standard',
    preco: 'R$ 97/mês',
    itens: [
      'Projetos ilimitados',
      'Cronograma dinâmico mês a mês',
      'Notion + sprints semanais',
      'Gestão em tempo real',
      'Relatórios periódicos',
    ],
    cta: 'Fazer upgrade',
  },
]

export default function ModalGerenciarPlano({ plano, onClose }: Props) {
  const isPago = ['standard', 'corporate', 'paid_pro'].includes(plano)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Seu plano atual</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Planos */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {PLANOS.map(p => {
            const ativo = plano === p.id || (isPago && p.id === 'standard')
            return (
              <div
                key={p.id}
                className={`rounded-xl border-2 p-4 flex flex-col gap-3 transition-colors
                  ${ativo ? 'border-[#1E3A6E] bg-[#1E3A6E]/5' : 'border-gray-200'}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-gray-900">{p.nome}</span>
                    {ativo && (
                      <span className="text-[10px] font-semibold bg-[#1E3A6E] text-white px-1.5 py-0.5 rounded-full">
                        ativo
                      </span>
                    )}
                  </div>
                  {p.preco && <div className="text-xs text-gray-500">{p.preco}</div>}
                </div>

                <ul className="space-y-1.5 flex-1">
                  {p.itens.map(item => (
                    <li key={item} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {p.cta && !isPago && (
                  <a
                    href={UPGRADE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-medium bg-[#1E3A6E] text-white rounded-lg py-2 hover:bg-[#162d56] transition-colors"
                  >
                    {p.cta} →
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {/* Corporate */}
        <div className="mx-6 mb-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
          Para planos <strong>Corporate</strong> (múltiplos usuários e organizações):{' '}
          <a href="mailto:contato@saacs.com.br" className="text-[#1E3A6E] hover:underline font-medium">
            contato@saacs.com.br
          </a>
        </div>

        <div className="flex justify-end px-6 pb-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Fechar</button>
        </div>
      </div>
    </div>
  )
}
