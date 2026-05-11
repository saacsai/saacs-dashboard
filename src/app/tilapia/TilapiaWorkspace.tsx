'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, type MiseEnPlaceItem } from '@/lib/supabase'
import SidebarProgress from '@/components/SidebarProgress'
import IngredienteCard from '@/components/IngredienteCard'
import EditarPerfilPage from '@/components/EditarPerfilPage'
import GerenciarPlanoPage from '@/components/GerenciarPlanoPage'
import OrganizacaoPage from '@/components/OrganizacaoPage'
import AnexosZone from '@/components/AnexosZone'

interface Props {
  projectId: string
  token: string
}

// Ingredientes por tipo — apenas conteúdo específico do projeto
// Documentos da organização (estatuto, ata, etc.) ficam em OrganizacaoPage
const INGREDIENTES_POR_TIPO: Record<string, Array<{ id: string; label: string; descricao: string; fase: string }>> = {
  edital: [
    { id: 'edital',      label: 'Edital',              descricao: 'PDF ou Word do edital completo',                   fase: 'regras' },
    { id: 'ideia_texto', label: 'Ideia do projeto',    descricao: 'Texto breve (opcional — pode ser descrito no chat)', fase: 'ideia' },
    { id: 'contexto',    label: 'Contexto / pesquisa', descricao: 'Diagnóstico, dados do território (opcional)',        fase: 'contexto' },
  ],
  generico: [
    { id: 'ideia_texto', label: 'Ideia do projeto',    descricao: 'Texto da ideia inicial (opcional)',                 fase: 'ideia' },
    { id: 'contexto',    label: 'Contexto / pesquisa', descricao: 'Diagnóstico ou dados do território (opcional)',      fase: 'contexto' },
  ],
  validar: [
    { id: 'projeto',     label: 'Projeto completo',    descricao: 'Plano de trabalho, orçamento e anexos',             fase: 'regras' },
    { id: 'contexto',    label: 'Contexto adicional',  descricao: 'Dados complementares do território (opcional)',      fase: 'contexto' },
  ],
}

const FASES_PROJETO = [
  { id: 'regras',   label: 'Regras do jogo' },
  { id: 'ideia',    label: 'Ideia do projeto' },
  { id: 'contexto', label: 'Contexto' },
]

function normalizarTipo(tipo: string | null): string {
  if (!tipo) return 'edital'
  const t = tipo.toLowerCase()
  if (t.includes('edital')) return 'edital'
  if (t.includes('generi') || t.includes('genéri')) return 'generico'
  if (t.includes('valid')) return 'validar'
  return 'edital'
}

export default function TilapiaWorkspace({ projectId, token }: Props) {
  const [items, setItems] = useState<MiseEnPlaceItem[]>([])
  const [tipoProjeto, setTipoProjeto] = useState<string>('edital')
  const [concluido, setConcluido] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')
  const [emailUsuario, setEmailUsuario] = useState<string>('')
  const [plano, setPlano] = useState<string>('free')

  // Organização
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgNome, setOrgNome] = useState<string>('')
  const [orgDocsCount, setOrgDocsCount] = useState(0)
  const [orgStatus, setOrgStatus] = useState<'pendente' | 'parcial' | 'pronto'>('pendente')

  // Modais / páginas
  const [modalPerfil, setModalPerfil] = useState(false)
  const [modalPlano, setModalPlano] = useState(false)
  const [modalOrg, setModalOrg] = useState(false)
  const [upgradeMsg, setUpgradeMsg] = useState<'success' | 'cancelled' | null>(null)
  const upgradeMsgShown = useRef(false)

  const carregarStatus = useCallback(async () => {
    const { data: proj } = await supabase
      .from('tlp_projetos')
      .select('tipo, mise_en_place_concluido, client_id, organizacao_id')
      .eq('id', projectId)
      .single()

    if (proj) {
      setTipoProjeto(normalizarTipo(proj.tipo))
      setConcluido(proj.mise_en_place_concluido || false)

      if (proj.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('nome, sobrenome, email, tier')
          .eq('id', proj.client_id)
          .single()
        if (client) {
          setNomeUsuario([client.nome, client.sobrenome].filter(Boolean).join(' '))
          setEmailUsuario(client.email || '')
          setPlano(client.tier || 'free')
        }
      }

      if (proj.organizacao_id) {
        setOrgId(proj.organizacao_id)
        const [{ data: org }, { data: orgDocs }] = await Promise.all([
          supabase.from('organizacoes').select('nome_fantasia').eq('id', proj.organizacao_id).single(),
          supabase.from('organizacao_docs').select('id').eq('organizacao_id', proj.organizacao_id).eq('status', 'pronto'),
        ])
        setOrgNome(org?.nome_fantasia || 'Organização')
        const count = orgDocs?.length || 0
        setOrgDocsCount(count)
        setOrgStatus(count === 0 ? 'parcial' : count >= 5 ? 'pronto' : 'parcial')
      } else {
        setOrgId(null)
        setOrgNome('')
        setOrgDocsCount(0)
        setOrgStatus('pendente')
      }
    }

    const { data } = await supabase
      .from('mise_en_place_items')
      .select('*')
      .eq('projeto_id', projectId)
      .order('atualizado_em', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (!upgradeMsgShown.current) {
      const params = new URLSearchParams(window.location.search)
      const upgrade = params.get('upgrade')
      if (upgrade === 'success' || upgrade === 'cancelled') {
        setUpgradeMsg(upgrade)
        upgradeMsgShown.current = true
        setTimeout(() => setUpgradeMsg(null), 6000)
      }
    }
  }, [])

  useEffect(() => {
    carregarStatus()

    const channel = supabase
      .channel(`mise_en_place_${projectId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'mise_en_place_items',
        filter: `projeto_id=eq.${projectId}`,
      }, () => carregarStatus())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, carregarStatus])

  const getStatus = (ingredienteId: string) => {
    const item = items.find(i => i.ingrediente === ingredienteId)
    return item?.status || 'pendente'
  }

  const getPreview = (ingredienteId: string) => {
    const item = items.find(i => i.ingrediente === ingredienteId)
    return item?.conteudo_md?.slice(0, 300) || item?.arquivo_original || undefined
  }

  const onSuccess = (ingrediente: string, preview: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.ingrediente === ingrediente)
      if (existing) {
        return prev.map(i => i.ingrediente === ingrediente
          ? { ...i, status: 'pronto', conteudo_md: preview } : i)
      }
      return [...prev, {
        id: crypto.randomUUID(), projeto_id: projectId,
        ingrediente, fase: '', status: 'pronto',
        arquivo_original: null, conteudo_md: preview,
        tamanho_bytes: null, criado_em: '', atualizado_em: '',
      }]
    })
  }

  const onError = (ingrediente: string, msg: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.ingrediente === ingrediente)
      if (existing) {
        return prev.map(i => i.ingrediente === ingrediente ? { ...i, status: 'erro', conteudo_md: msg } : i)
      }
      return [...prev, {
        id: crypto.randomUUID(), projeto_id: projectId,
        ingrediente, fase: '', status: 'erro',
        arquivo_original: null, conteudo_md: msg,
        tamanho_bytes: null, criado_em: '', atualizado_em: '',
      }]
    })
  }

  const totalTokens = items
    .filter(i => i.status === 'pronto' && i.conteudo_md)
    .reduce((acc, i) => acc + Math.round((i.conteudo_md?.length || 0) / 4), 0)

  const ingredientes = INGREDIENTES_POR_TIPO[tipoProjeto] || INGREDIENTES_POR_TIPO.edital

  // Sidebar: organização + fases do projeto (só fases com ingredientes para este tipo)
  const fasesComStatus = [
    {
      id: 'organizacao',
      label: 'Organização',
      status: orgStatus,
    },
    ...FASES_PROJETO
      .filter(fase => ingredientes.some(i => i.fase === fase.id))
      .map(fase => {
        const fasIngredientes = ingredientes.filter(i => i.fase === fase.id)
        const prontos = fasIngredientes.filter(i => getStatus(i.id) === 'pronto').length
        const status = prontos === 0 ? 'pendente'
          : prontos === fasIngredientes.length ? 'pronto'
          : 'parcial'
        return { ...fase, status } as { id: string; label: string; status: 'pendente' | 'pronto' | 'parcial' }
      }),
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Carregando projeto…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarProgress
        fases={fasesComStatus}
        concluido={concluido}
        tipoProjeto={tipoProjeto}
        nomeUsuario={nomeUsuario}
        emailUsuario={emailUsuario}
        plano={plano}
        onEditarPerfil={() => setModalPerfil(true)}
        onGerenciarPlano={() => setModalPlano(true)}
      />

      {upgradeMsg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          upgradeMsg === 'success' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'
        }`}>
          {upgradeMsg === 'success'
            ? '✓ Assinatura confirmada! Seu plano foi ativado.'
            : 'Pagamento cancelado. Seu plano não foi alterado.'}
        </div>
      )}

      <main className="ml-64 min-h-screen p-8 overflow-y-auto">
        {modalOrg ? (
          <OrganizacaoPage
            orgId={orgId}
            token={token}
            onVoltar={() => { setModalOrg(false); carregarStatus() }}
            onOrgCreated={(id, nome) => {
              setOrgId(id)
              setOrgNome(nome)
              setOrgStatus('parcial')
              setModalOrg(false)
            }}
          />
        ) : modalPerfil ? (
          <EditarPerfilPage
            token={token}
            onVoltar={() => setModalPerfil(false)}
            onSaved={nome => { setNomeUsuario(nome); setModalPerfil(false) }}
          />
        ) : modalPlano ? (
          <GerenciarPlanoPage
            plano={plano}
            token={token}
            onVoltar={() => setModalPlano(false)}
          />
        ) : (
          <div className="max-w-2xl mx-auto">

            {/* ── Seção Organização ── */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Organização</h2>
              {orgId ? (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {orgNome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{orgNome}</p>
                      <p className="text-xs text-gray-500">
                        {orgDocsCount}/7 documentos enviados
                        {orgStatus === 'pronto' && ' — ✅ completo'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOrg(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Gerenciar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Organização não configurada</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Adicione sua organização para carregar estatuto, ata, CNPJ e demais documentos institucionais.
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOrg(true)}
                    className="ml-4 shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* ── Mise en place ── */}
            <div className="mb-8">
              <h1 className="text-xl font-bold text-gray-900">Mise en place</h1>
              <p className="text-sm text-gray-500 mt-1">
                Envie os documentos do projeto. Quando terminar, volte ao chat e avise o Claude.
              </p>
              {totalTokens > 0 && (
                <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
                  totalTokens > 80000
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {totalTokens > 80000 ? (
                    <span><strong>Documentos grandes detectados</strong> (~{Math.round(totalTokens / 1000)}k tokens). Considere remover os menos relevantes.</span>
                  ) : (
                    <span>Volume total: ~{Math.round(totalTokens / 1000)}k tokens — dentro do limite.</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {ingredientes.map(ing => (
                <>
                  <IngredienteCard
                    key={ing.id}
                    ingrediente={ing.id}
                    label={ing.label}
                    descricao={ing.descricao}
                    status={getStatus(ing.id)}
                    preview={getPreview(ing.id)}
                    fase={ing.fase}
                    projectId={projectId}
                    token={token}
                    onSuccess={onSuccess}
                    onError={onError}
                  />
                  {tipoProjeto === 'edital' && ing.id === 'edital' && (
                    <AnexosZone
                      key="anexos"
                      projectId={projectId}
                      token={token}
                      anexosIniciais={items.map(i => ({ ingrediente: i.ingrediente, arquivo_original: i.arquivo_original }))}
                    />
                  )}
                </>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <strong>Pronto?</strong> Volte ao chat com o Claude e diga: <em>&ldquo;feito&rdquo;</em>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
