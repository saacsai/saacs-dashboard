'use client'

import UploadZone from './UploadZone'

type Status = 'pendente' | 'uploading' | 'processando' | 'pronto' | 'erro'

interface Props {
  ingrediente: string
  label: string
  descricao?: string
  status: Status
  preview?: string
  arquivo?: string
  fase: string
  projectId: string
  token: string
  onSuccess: (ingrediente: string, preview: string) => void
  onError: (ingrediente: string, msg: string) => void
}

const STATUS_CONFIG: Record<Status, { icon: string; label: string; color: string }> = {
  pendente:     { icon: '○',  label: 'Aguardando',    color: 'text-gray-400' },
  uploading:    { icon: '⏫', label: 'Enviando…',      color: 'text-blue-500' },
  processando:  { icon: '⚙️', label: 'Processando…',  color: 'text-yellow-500' },
  pronto:       { icon: '✅', label: 'Pronto',         color: 'text-green-600' },
  erro:         { icon: '❌', label: 'Erro',            color: 'text-red-500' },
}

export default function IngredienteCard({
  ingrediente, label, descricao, status, preview, arquivo,
  fase, projectId, token, onSuccess, onError
}: Props) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div className={`rounded-lg border p-4 ${status === 'pronto' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-medium text-gray-800">{label}</span>
          {descricao && <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>}
        </div>
        <span className={`text-sm font-medium ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {status === 'pronto' && preview && (
        <div className="mt-2 p-3 bg-white rounded border border-green-100 text-xs text-gray-600 line-clamp-3 font-mono">
          {preview}
        </div>
      )}

      {status === 'pronto' && arquivo && !preview && (
        <div className="mt-2 text-xs text-gray-500">📄 {arquivo}</div>
      )}

      {status === 'erro' && preview && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">{preview}</div>
      )}

      <div className="mt-3">
        <UploadZone
          ingrediente={ingrediente}
          fase={fase}
          projectId={projectId}
          token={token}
          onSuccess={onSuccess}
          onError={onError}
          disabled={status === 'pronto'}
        />
      </div>
    </div>
  )
}
