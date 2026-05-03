'use client'

import Image from 'next/image'
import TilapiaLogo from './TilapiaLogo'

type Status = 'pendente' | 'pronto' | 'parcial'

interface Fase {
  id: string
  label: string
  status: Status
}

interface Props {
  fases: Fase[]
  concluido: boolean
  nomeUsuario?: string
  plano?: string
  tipoProjeto?: string
}

const PLANO_LABEL: Record<string, string> = {
  free: 'Gratuito',
  standard: 'Standard',
  corporate: 'Corporate',
  paid_pro: 'Pro',
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'pronto') return <span className="text-green-500 text-sm">✅</span>
  if (status === 'parcial') return <span className="text-yellow-500 text-sm">⏳</span>
  return <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />
}

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

export default function SidebarProgress({ fases, concluido, nomeUsuario, plano = 'free', tipoProjeto }: Props) {
  const prontos = fases.filter(f => f.status === 'pronto').length
  const pct = fases.length > 0 ? Math.round((prontos / fases.length) * 100) : 0
  const planoLabel = PLANO_LABEL[plano] ?? plano

  const primeiroNome = nomeUsuario?.split(' ')[0] || ''
  const sobrenome = nomeUsuario?.split(' ').slice(-1)[0] || ''
  const nomeExibido = primeiroNome && sobrenome && primeiroNome !== sobrenome
    ? `${primeiroNome} ${sobrenome}`
    : primeiroNome || nomeUsuario || 'Usuário'

  return (
    <aside
      style={{ position: 'fixed', top: 0, left: 0, width: '256px', height: '100vh', zIndex: 10 }}
      className="flex flex-col bg-white border-r border-gray-200"
    >
      {/* Logo TILAPIA Standard */}
      <div className="flex justify-center pt-5 pb-4 px-4">
        <TilapiaLogo size="md" />
      </div>

      {/* Progresso */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Mise en place</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Fases */}
      <nav className="flex-1 px-2 overflow-y-auto">
        {fases.map(fase => (
          <div key={fase.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg">
            <StatusIcon status={fase.status} />
            <span className={`text-sm ${fase.status === 'pronto' ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {fase.label}
            </span>
          </div>
        ))}
      </nav>

      {concluido && (
        <div className="mx-4 mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
          ✅ Mise en place concluído!
        </div>
      )}

      {/* Rodapé */}
      <div className="border-t border-gray-100">
        {/* Avatar + nome + plano */}
        <div className="flex items-center gap-2.5 px-3 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{initials(nomeUsuario || 'U')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">{nomeExibido}</div>
            <div className="text-xs text-gray-400">{planoLabel}</div>
          </div>
        </div>

        {/* Powered by SAACS — centralizado, largura harmoniosa */}
        <div className="flex flex-col items-center gap-1 py-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 tracking-wide">powered by</span>
          <Image src="/logo_saacs.png" alt="SAACS" width={120} height={38} className="object-contain opacity-60" />
        </div>
      </div>
    </aside>
  )
}
