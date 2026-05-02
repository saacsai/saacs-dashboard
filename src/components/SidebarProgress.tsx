'use client'

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
  tipoProjeto?: string
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'pronto') return <span className="text-green-500">✅</span>
  if (status === 'parcial') return <span className="text-yellow-500">⏳</span>
  return <span className="text-gray-300">○</span>
}

export default function SidebarProgress({ fases, concluido, nomeUsuario, tipoProjeto }: Props) {
  const prontos = fases.filter(f => f.status === 'pronto').length
  const pct = Math.round((prontos / fases.length) * 100)

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-gray-200 p-4">
      <div className="mb-6">
        <div className="flex items-baseline gap-0 mb-1">
          <span className="text-xl font-black tracking-tight text-[#1E3A6E]">TILAP</span>
          <span className="text-xl font-black tracking-tight text-[#7EB0D9]">IA</span>
        </div>
        <div className="text-xs text-gray-400 font-medium tracking-wide">Standard</div>
        {nomeUsuario && <p className="text-sm text-gray-600 mt-1">{nomeUsuario}</p>}
        {tipoProjeto && <p className="text-xs text-gray-400 capitalize">{tipoProjeto}</p>}
      </div>

      <div className="mb-4">
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

      <nav className="flex-1 space-y-1">
        {fases.map(fase => (
          <div key={fase.id} className="flex items-center gap-2 py-1.5 px-2 rounded">
            <StatusIcon status={fase.status} />
            <span className={`text-sm ${fase.status === 'pronto' ? 'text-gray-700' : 'text-gray-400'}`}>
              {fase.label}
            </span>
          </div>
        ))}
      </nav>

      {concluido && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
          ✅ Mise en place concluído!
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Voltar ao chat
        </a>
      </div>
    </aside>
  )
}
