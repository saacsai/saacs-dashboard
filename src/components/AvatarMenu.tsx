'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  nomeExibido: string
  email: string
  planoLabel: string
  initials: string
  onEditarPerfil: () => void
  onGerenciarPlano: () => void
  onSair: () => void
}

export default function AvatarMenu({ nomeExibido, email, planoLabel, initials, onEditarPerfil, onGerenciarPlano, onSair }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Submenu — abre para cima */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
          {/* Header do usuário */}
          <div className="px-3 py-2.5">
            <div className="text-sm font-semibold text-gray-900 truncate">{nomeExibido}</div>
            <div className="text-xs text-gray-500 truncate">{email}</div>
          </div>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => { setOpen(false); onEditarPerfil() }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="text-base">✏️</span> Editar perfil
          </button>

          <button
            onClick={() => { setOpen(false); onGerenciarPlano() }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="text-base">⚡</span> Gerenciar plano
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => { setOpen(false); onSair() }}
            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <span className="text-base">🚪</span> Sair
          </button>
        </div>
      )}

      {/* Trigger — avatar + nome + plano */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{nomeExibido}</div>
          <div className="text-xs text-gray-400">{planoLabel}</div>
        </div>
        <span className="text-gray-400 text-xs">{open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
