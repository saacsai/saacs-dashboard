'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { convertFileClientSide, getFileExt, isClientSideConvertible } from '@/lib/converters'

// ─── Configuração dos documentos da organização ──────────────────────────────

const DOCS_IDENTIDADE = [
  { id: 'logo',           label: 'Logo',            descricao: 'Logotipo da organização',                accept: '.jpg,.jpeg,.png' },
  { id: 'papel_timbrado', label: 'Papel timbrado',  descricao: 'Cabeçalho para documentos oficiais',    accept: '.pdf,.jpg,.jpeg,.png' },
]

const DOCS_INSTITUCIONAIS = [
  { id: 'estatuto',           label: 'Estatuto / Contrato Social', descricao: 'Documento constitutivo da organização',      accept: '.pdf,.docx,.doc' },
  { id: 'ata_dirigentes',     label: 'Ata de Dirigentes',          descricao: 'Ata de eleição da diretoria vigente',         accept: '.pdf,.docx,.doc' },
  { id: 'cartao_cnpj',        label: 'Cartão CNPJ',                descricao: 'Comprovante de CNPJ ativo',                   accept: '.pdf,.jpg,.jpeg,.png' },
  { id: 'cnds',               label: 'CND / CNDS',                 descricao: 'Certidão Negativa de Débitos',                accept: '.pdf,.jpg,.jpeg,.png' },
  { id: 'curriculo_entidade', label: 'Currículo da entidade',      descricao: 'Histórico e portfólio da organização',        accept: '.pdf,.docx,.doc' },
]

const TODOS_DOCS = [...DOCS_IDENTIDADE, ...DOCS_INSTITUCIONAIS]

// ─── Tipos ───────────────────────────────────────────────────────────────────

type DocStatus = 'pendente' | 'uploading' | 'pronto' | 'erro'

interface OrgDoc {
  ingrediente: string
  status: DocStatus
  arquivo_original: string | null
  preview: string | null
}

interface Props {
  orgId: string | null
  token: string
  onVoltar: () => void
  onOrgCreated: (id: string, nome: string) => void
}

// ─── Componente inline de upload por documento ───────────────────────────────

function DocUploadZone({
  docId, accept, orgId, token, onSuccess, onError, disabled,
}: {
  docId: string
  accept: string
  orgId: string
  token: string
  onSuccess: (ingrediente: string, arquivo: string, preview: string) => void
  onError: (ingrediente: string, msg: string) => void
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const ext = getFileExt(file.name)
      let conteudo_md: string

      if (isClientSideConvertible(ext)) {
        const md = await convertFileClientSide(file)
        conteudo_md = md || `[${file.name}]`
      } else {
        // Imagem: registra presença sem extrair texto
        conteudo_md = `[Imagem: ${file.name}]`
      }

      const res = await fetch(`/api/organizacao/upload/${orgId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingrediente: docId,
          conteudo_md,
          arquivo_original: file.name,
          tamanho_bytes: file.size,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onSuccess(docId, file.name, conteudo_md.slice(0, 200))
    } catch (e) {
      onError(docId, e instanceof Error ? e.message : 'Erro ao processar')
    } finally {
      setLoading(false)
    }
  }, [docId, orgId, token, onSuccess, onError])

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
      className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input type="file" accept={accept} className="hidden" onChange={onChange} />
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Processando…
        </div>
      ) : (
        <div className="text-gray-500 text-sm">
          <span className="text-lg mr-1">📎</span>
          Arraste ou clique para selecionar
        </div>
      )}
    </label>
  )
}

// ─── Card de documento ────────────────────────────────────────────────────────

function DocCard({ doc, config, orgId, token, onSuccess, onError }: {
  doc: OrgDoc
  config: typeof TODOS_DOCS[number]
  orgId: string
  token: string
  onSuccess: (ingrediente: string, arquivo: string, preview: string) => void
  onError: (ingrediente: string, msg: string) => void
}) {
  const isPronto = doc.status === 'pronto'

  return (
    <div className={`rounded-lg border p-4 ${isPronto ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-medium text-gray-800 text-sm">{config.label}</span>
          <p className="text-xs text-gray-500 mt-0.5">{config.descricao}</p>
        </div>
        <span className={`text-xs font-medium ${
          isPronto ? 'text-green-600' :
          doc.status === 'uploading' ? 'text-blue-500' :
          doc.status === 'erro' ? 'text-red-500' : 'text-gray-400'
        }`}>
          {isPronto ? '✅ Pronto' : doc.status === 'uploading' ? '⏫ Enviando…' : doc.status === 'erro' ? '❌ Erro' : '○ Aguardando'}
        </span>
      </div>

      {isPronto && doc.arquivo_original && (
        <div className="mb-2 text-xs text-gray-500 font-mono truncate">📄 {doc.arquivo_original}</div>
      )}

      {doc.status === 'erro' && doc.preview && (
        <div className="mb-2 p-2 bg-red-50 rounded text-xs text-red-600">{doc.preview}</div>
      )}

      <DocUploadZone
        docId={doc.ingrediente}
        accept={config.accept}
        orgId={orgId}
        token={token}
        onSuccess={onSuccess}
        onError={onError}
        disabled={isPronto}
      />

      {isPronto && (
        <button
          onClick={() => onSuccess(doc.ingrediente, '', '')}
          className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="Substituir arquivo"
        >
          Substituir
        </button>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function OrganizacaoPage({ orgId: orgIdProp, token, onVoltar, onOrgCreated }: Props) {
  const [orgId, setOrgId] = useState<string | null>(orgIdProp)
  const [form, setForm] = useState({
    nome_fantasia: '', razao_social: '', cnpj: '',
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  })
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'erro'>('idle')
  const [docs, setDocs] = useState<OrgDoc[]>(
    TODOS_DOCS.map(d => ({ ingrediente: d.id, status: 'pendente' as DocStatus, arquivo_original: null, preview: null }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const sucTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega org existente
  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    fetch('/api/organizacao', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          setForm({
            nome_fantasia: d.org.nome_fantasia || '',
            razao_social: d.org.razao_social || '',
            cnpj: d.org.cnpj || '',
            logradouro: d.org.logradouro || '',
            numero: d.org.numero || '',
            complemento: d.org.complemento || '',
            bairro: d.org.bairro || '',
            cidade: d.org.cidade || '',
            uf: d.org.uf || '',
            cep: d.org.cep || '',
          })
        }
        if (d.docs?.length) {
          setDocs(prev => prev.map(doc => {
            const found = d.docs.find((x: { ingrediente: string; status: string; arquivo_original: string | null; conteudo_md: string | null }) => x.ingrediente === doc.ingrediente)
            if (!found) return doc
            return {
              ...doc,
              status: found.status as DocStatus,
              arquivo_original: found.arquivo_original,
              preview: found.conteudo_md?.slice(0, 200) || null,
            }
          }))
        }
      })
      .catch(() => setErro('Erro ao carregar organização'))
      .finally(() => setLoading(false))
  }, [orgId, token])

  function showSucesso() {
    setSucesso(true)
    if (sucTimer.current) clearTimeout(sucTimer.current)
    sucTimer.current = setTimeout(() => setSucesso(false), 3000)
  }

  async function handleCnpjBlur(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    setCnpjStatus('idle')
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) throw new Error('não encontrado')
      const d = await res.json()
      setForm(f => ({
        ...f,
        razao_social: d.razao_social || f.razao_social,
        nome_fantasia: d.nome_fantasia || f.nome_fantasia,
        logradouro: [d.logradouro_tipo, d.logradouro].filter(Boolean).join(' ') || f.logradouro,
        numero: d.numero || f.numero,
        complemento: d.complemento || f.complemento,
        bairro: d.bairro || f.bairro,
        cidade: d.municipio || f.cidade,
        uf: d.uf || f.uf,
        cep: d.cep || f.cep,
      }))
      setCnpjStatus('ok')
    } catch {
      setCnpjStatus('erro')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  // Criar nova organização
  async function handleCriar() {
    if (!form.nome_fantasia.trim()) { setErro('Informe o nome da organização'); return }
    setCreating(true); setErro('')
    try {
      const res = await fetch('/api/organizacao', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const id = data.org.id
      const nome = data.org.nome_fantasia || 'Organização'
      setOrgId(id)
      onOrgCreated(id, nome)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar organização')
    } finally {
      setCreating(false)
    }
  }

  // Salvar informações
  async function handleSalvar() {
    if (!orgId) return
    setSaving(true); setErro('')
    try {
      const res = await fetch('/api/organizacao', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, ...form }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showSucesso()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDocSuccess = useCallback((ingrediente: string, arquivo: string, preview: string) => {
    setDocs(prev => prev.map(d => d.ingrediente === ingrediente
      ? { ...d, status: arquivo ? 'pronto' : 'pendente', arquivo_original: arquivo || null, preview: preview || null }
      : d
    ))
  }, [])

  const handleDocError = useCallback((ingrediente: string, msg: string) => {
    setDocs(prev => prev.map(d => d.ingrediente === ingrediente
      ? { ...d, status: 'erro', preview: msg }
      : d
    ))
  }, [])

  // ── Render ──

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onVoltar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Organização</h1>
        </div>
        <div className="text-gray-400 text-sm">Carregando…</div>
      </div>
    )
  }

  // ── Criar organização (primeira vez) ──────────────────────────────────────
  if (!orgId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onVoltar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Organização</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 text-sm text-blue-800">
          <strong>Por que começar pela organização?</strong>
          <p className="mt-1 text-blue-700">
            Documentos como estatuto, cartão CNPJ e CND pertencem à organização — não ao projeto.
            Cadastre uma vez e todos os seus projetos herdam automaticamente.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da organização <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome_fantasia}
              onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))}
              placeholder="Ex: Associação Quintais Produtivos"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razão social</label>
            <input
              type="text"
              value={form.razao_social}
              onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))}
              placeholder="Ex: Associação de Desenvolvimento Rural..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <div className="relative">
              <input
                type="text"
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                onBlur={e => handleCnpjBlur(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {buscandoCnpj && (
                <span className="absolute right-3 top-2.5 text-xs text-blue-500 flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Buscando…
                </span>
              )}
              {!buscandoCnpj && cnpjStatus === 'ok' && (
                <span className="absolute right-3 top-2.5 text-xs text-green-600">✓ Dados preenchidos</span>
              )}
              {!buscandoCnpj && cnpjStatus === 'erro' && (
                <span className="absolute right-3 top-2.5 text-xs text-red-500">CNPJ não encontrado</span>
              )}
            </div>
          </div>

          {(form.logradouro || form.cidade) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input type="text" value={form.logradouro}
                  onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" value={form.complemento}
                  onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={form.bairro}
                  onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <input type="text" value={form.uf} maxLength={2}
                    onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input type="text" value={form.cep}
                    onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            onClick={handleCriar}
            disabled={creating || !form.nome_fantasia.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Criando…' : 'Criar organização'}
          </button>
        </div>
      </div>
    )
  }

  // ── Gerenciar organização existente ───────────────────────────────────────
  const docsIdentidade = DOCS_IDENTIDADE.map(cfg => ({ cfg, doc: docs.find(d => d.ingrediente === cfg.id)! }))
  const docsInstitucionais = DOCS_INSTITUCIONAIS.map(cfg => ({ cfg, doc: docs.find(d => d.ingrediente === cfg.id)! }))
  const prontos = docs.filter(d => d.status === 'pronto').length

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onVoltar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organização</h1>
          <p className="text-sm text-gray-500 mt-0.5">{prontos}/{TODOS_DOCS.length} documentos enviados</p>
        </div>
      </div>

      {/* Identificação */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Identificação</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da organização</label>
            <input
              type="text"
              value={form.nome_fantasia}
              onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razão social</label>
            <input
              type="text"
              value={form.razao_social}
              onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <div className="relative">
              <input
                type="text"
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                onBlur={e => handleCnpjBlur(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {buscandoCnpj && (
                <span className="absolute right-3 top-2.5 text-xs text-blue-500 flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Buscando…
                </span>
              )}
              {!buscandoCnpj && cnpjStatus === 'ok' && (
                <span className="absolute right-3 top-2.5 text-xs text-green-600">✓ Dados atualizados</span>
              )}
              {!buscandoCnpj && cnpjStatus === 'erro' && (
                <span className="absolute right-3 top-2.5 text-xs text-red-500">CNPJ não encontrado</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Endereço — preenchido automaticamente ao informar o CNPJ</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input type="text" value={form.logradouro}
                  onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" value={form.complemento}
                  onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={form.bairro}
                  onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <input type="text" value={form.uf} maxLength={2}
                    onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input type="text" value={form.cep}
                    onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="mt-3 text-sm text-green-600">✓ Salvo com sucesso</p>}

        <button
          onClick={handleSalvar}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </section>

      {/* Identidade Visual */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Identidade Visual</h2>
        <div className="space-y-3">
          {docsIdentidade.map(({ cfg, doc }) => (
            <DocCard
              key={cfg.id}
              doc={doc}
              config={cfg}
              orgId={orgId}
              token={token}
              onSuccess={handleDocSuccess}
              onError={handleDocError}
            />
          ))}
        </div>
      </section>

      {/* Documentos Institucionais */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Documentos Institucionais</h2>
        <p className="text-xs text-gray-500 mb-3">
          Enviados uma vez — disponíveis em todos os seus projetos.
        </p>
        <div className="space-y-3">
          {docsInstitucionais.map(({ cfg, doc }) => (
            <DocCard
              key={cfg.id}
              doc={doc}
              config={cfg}
              orgId={orgId}
              token={token}
              onSuccess={handleDocSuccess}
              onError={handleDocError}
            />
          ))}
        </div>
      </section>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <strong>Pronto?</strong> Volte ao chat com o Claude e diga: <em>&ldquo;feito&rdquo;</em>
      </div>

    </div>
  )
}
