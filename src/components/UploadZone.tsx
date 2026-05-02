'use client'

import { useCallback, useState } from 'react'
import { convertFileClientSide, getFileExt, isClientSideConvertible } from '@/lib/converters'

interface Props {
  ingrediente: string
  fase: string
  projectId: string
  token: string
  onSuccess: (ingrediente: string, preview: string) => void
  onError: (ingrediente: string, msg: string) => void
  disabled?: boolean
}

const ACCEPTED = '.pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png'

export default function UploadZone({ ingrediente, fase, projectId, token, onSuccess, onError, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const ext = getFileExt(file.name)
      let res: { status: string; preview?: string }

      if (isClientSideConvertible(ext)) {
        // Converte client-side, envia só o texto
        const md = await convertFileClientSide(file)
        if (!md) throw new Error('Conversão retornou vazio')

        const body = {
          conteudo_md: md,
          fase,
          ingrediente,
          arquivo_original: file.name,
          tamanho_bytes: file.size,
        }
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br'}/api/projetos/${projectId}/mise-en-place/upload-text`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        )
        res = await resp.json()
      } else {
        // Imagem: envia arquivo direto para o servidor converter com MarkItDown
        const form = new FormData()
        form.append('arquivo', file)
        form.append('fase', fase)
        form.append('ingrediente', ingrediente)
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br'}/api/projetos/${projectId}/mise-en-place/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          }
        )
        res = await resp.json()
      }

      if (res.status === 'pronto') {
        onSuccess(ingrediente, res.preview || '')
      } else {
        onError(ingrediente, res.preview || 'Erro ao processar')
      }
    } catch (e) {
      onError(ingrediente, e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [ingrediente, fase, projectId, token, onSuccess, onError])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  if (disabled) return null

  return (
    <label
      className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input type="file" accept={ACCEPTED} className="hidden" onChange={onChange} />
      {loading ? (
        <div className="flex flex-col items-center gap-2 text-blue-600">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Processando…</span>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">
          <div className="text-2xl mb-1">📎</div>
          <div>Arraste o arquivo ou clique para selecionar</div>
          <div className="text-xs mt-1 text-gray-400">PDF, Word, Excel ou imagem</div>
        </div>
      )}
    </label>
  )
}
