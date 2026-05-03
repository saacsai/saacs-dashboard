'use client'

import { useCallback, useState } from 'react'
import { convertFileClientSide, getFileExt, isClientSideConvertible } from '@/lib/converters'

interface Anexo {
  id: string
  nome: string
  status: 'processando' | 'pronto' | 'erro'
  mensagem?: string
}

interface Props {
  projectId: string
  token: string
  anexosIniciais?: { ingrediente: string; arquivo_original: string | null }[]
}

const ACCEPTED = '.pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png'

export default function AnexosZone({ projectId, token, anexosIniciais = [] }: Props) {
  const [anexos, setAnexos] = useState<Anexo[]>(
    anexosIniciais
      .filter(a => a.ingrediente.startsWith('anexo_'))
      .map(a => ({
        id: a.ingrediente,
        nome: a.arquivo_original || a.ingrediente,
        status: 'pronto' as const,
      }))
  )
  const [dragging, setDragging] = useState(false)

  const processarArquivo = useCallback(async (file: File) => {
    const id = `anexo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const novoAnexo: Anexo = { id, nome: file.name, status: 'processando' }
    setAnexos(prev => [...prev, novoAnexo])

    try {
      const ext = getFileExt(file.name)
      let resp: Response

      if (isClientSideConvertible(ext)) {
        const md = await convertFileClientSide(file)
        if (!md) throw new Error('Conversão retornou vazio')
        resp = await fetch(`/api/upload/${projectId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conteudo_md: md,
            fase: 'anexos',
            ingrediente: id,
            arquivo_original: file.name,
            tamanho_bytes: file.size,
          }),
        })
      } else {
        const form = new FormData()
        form.append('arquivo', file)
        form.append('fase', 'anexos')
        form.append('ingrediente', id)
        resp = await fetch(`/api/upload/${projectId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
      }

      const res = await resp.json()
      setAnexos(prev => prev.map(a =>
        a.id === id
          ? { ...a, status: res.status === 'pronto' ? 'pronto' : 'erro', mensagem: res.status !== 'pronto' ? res.preview : undefined }
          : a
      ))
    } catch (e) {
      setAnexos(prev => prev.map(a =>
        a.id === id
          ? { ...a, status: 'erro', mensagem: e instanceof Error ? e.message : 'Erro desconhecido' }
          : a
      ))
    }
  }, [projectId, token])

  const processarArquivos = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      await processarArquivo(file)
    }
  }, [processarArquivo])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) processarArquivos(e.dataTransfer.files)
  }, [processarArquivos])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processarArquivos(e.target.files)
    e.target.value = ''
  }, [processarArquivos])

  const processando = anexos.filter(a => a.status === 'processando').length
  const prontos = anexos.filter(a => a.status === 'pronto').length

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium text-gray-800">Anexos do edital</span>
          <p className="text-xs text-gray-500 mt-0.5">Manuais, declarações e demais documentos exigidos</p>
        </div>
        {prontos > 0 && (
          <span className="text-sm font-medium text-green-600">
            ✅ {prontos} arquivo{prontos > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Lista de anexos enviados */}
      {anexos.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {anexos.map(a => (
            <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              a.status === 'pronto' ? 'bg-green-50 border border-green-100' :
              a.status === 'erro'   ? 'bg-red-50 border border-red-100' :
                                      'bg-blue-50 border border-blue-100'
            }`}>
              {a.status === 'processando' && (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {a.status === 'pronto' && <span className="flex-shrink-0">✅</span>}
              {a.status === 'erro'   && <span className="flex-shrink-0">❌</span>}
              <span className={`truncate ${a.status === 'erro' ? 'text-red-700' : 'text-gray-700'}`}>
                {a.nome}
              </span>
              {a.mensagem && <span className="text-red-500 ml-auto flex-shrink-0">{a.mensagem}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label
        className={`block border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${processando > 0 ? 'opacity-60 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" accept={ACCEPTED} multiple className="hidden" onChange={onChange} />
        {processando > 0 ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Processando {processando} arquivo{processando > 1 ? 's' : ''}…</span>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            <div className="text-2xl mb-1">📎</div>
            <div>Arraste os arquivos ou clique para selecionar</div>
            <div className="text-xs mt-1 text-gray-400">Vários arquivos de uma vez • PDF, Word, Excel ou imagem</div>
          </div>
        )}
      </label>
    </div>
  )
}
