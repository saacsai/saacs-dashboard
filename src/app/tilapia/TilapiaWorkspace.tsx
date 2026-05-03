'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type MiseEnPlaceItem } from '@/lib/supabase'
import SidebarProgress from '@/components/SidebarProgress'
import IngredienteCard from '@/components/IngredienteCard'
import ModalEditarPerfil from '@/components/ModalEditarPerfil'
import ModalGerenciarPlano from '@/components/ModalGerenciarPlano'

interface Props {
  projectId: string
  token: string
}

// Ingredientes por tipo de projeto
const INGREDIENTES_POR_TIPO: Record<string, Array<{ id: string; label: string; descricao: string; fase: string }>> = {
  edital: [
    { id: 'edital',          label: 'Edital',               descricao: 'PDF ou Word do edital completo', fase: 'regras' },
    { id: 'ideia_texto',     label: 'Ideia do projeto',     descricao: 'Texto breve (opcional — pode ser descrito no chat)', fase: 'ideia' },
    { id: 'contexto',        label: 'Contexto / pesquisa',  descricao: 'Diagnóstico, dados do território (opcional)', fase: 'contexto' },
    { id: 'estatuto',        label: 'Estatuto / contrato',  descricao: 'Documento da organização proponente (opcional)', fase: 'proponente' },
    { id: 'curriculo',       label: 'Currículo do RT',      descricao: 'Responsável técnico do projeto (opcional)', fase: 'proponente' },
    { id: 'historico',       label: 'Projetos anteriores',  descricao: 'Relatórios de projetos similares (opcional)', fase: 'proponente' },
  ],
  generico: [
    { id: 'ideia_texto',     label: 'Ideia do projeto',     descricao: 'Texto da ideia inicial (opcional — pode ser descrito no chat)', fase: 'ideia' },
    { id: 'contexto',        label: 'Contexto / pesquisa',  descricao: 'Diagnóstico ou dados do território (opcional)', fase: 'contexto' },
    { id: 'estatuto',        label: 'Estatuto / contrato',  descricao: 'Documento da organização (opcional)', fase: 'proponente' },
    { id: 'curriculo',       label: 'Currículo do responsável', descricao: 'Responsável pelo projeto (opcional)', fase: 'proponente' },
  ],
  validar: [
    { id: 'projeto',         label: 'Projeto completo',     descricao: 'Plano de trabalho, orçamento e anexos', fase: 'regras' },
    { id: 'contexto',        label: 'Contexto adicional',   descricao: 'Dados complementares do território (opcional)', fase: 'contexto' },
    { id: 'estatuto',        label: 'Estatuto / contrato',  descricao: 'Documento da organização (opcional)', fase: 'proponente' },
  ],
}

const FASES_SIDEBAR = [
  { id: 'regras',     label: 'Regras do jogo' },
  { id: 'ideia',      label: 'Ideia do projeto' },
  { id: 'contexto',   label: 'Contexto' },
  { id: 'proponente', label: 'Proponente' },
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
  const [modalPerfil, setModalPerfil] = useState(false)
  const [modalPlano, setModalPlano] = useState(false)

  const carregarStatus = useCallback(async () => {
    const { data: proj } = await supabase
      .from('tlp_projetos')
      .select('tipo, mise_en_place_concluido, client_id')
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
          const nomeCompleto = [client.nome, client.sobrenome].filter(Boolean).join(' ')
          setNomeUsuario(nomeCompleto)
          setEmailUsuario(client.email || '')
          setPlano(client.tier || 'free')
        }
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
    carregarStatus()

    // Supabase realtime: atualiza cards quando status muda
    const channel = supabase
      .channel(`mise_en_place_${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
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
          ? { ...i, status: 'pronto', conteudo_md: preview }
          : i)
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

  const ingredientes = INGREDIENTES_POR_TIPO[tipoProjeto] || INGREDIENTES_POR_TIPO.edital

  const fasesComStatus = FASES_SIDEBAR.map(fase => {
    const fasIngredientes = ingredientes.filter(i => i.fase === fase.id)
    const prontos = fasIngredientes.filter(i => getStatus(i.id) === 'pronto').length
    const status = prontos === 0 ? 'pendente'
      : prontos === fasIngredientes.length ? 'pronto'
      : 'parcial'
    return { ...fase, status } as { id: string; label: string; status: 'pendente' | 'pronto' | 'parcial' }
  })

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

      {modalPerfil && (
        <ModalEditarPerfil
          token={token}
          onClose={() => setModalPerfil(false)}
          onSaved={nome => setNomeUsuario(nome)}
        />
      )}

      {modalPlano && (
        <ModalGerenciarPlano
          plano={plano}
          onClose={() => setModalPlano(false)}
        />
      )}

      {/* Área de trabalho — margem esquerda = largura da sidebar */}
      <main className="ml-64 min-h-screen p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">Mise en place</h1>
            <p className="text-sm text-gray-500 mt-1">
              Envie os documentos abaixo. Quando terminar, volte ao chat e avise o Claude.
            </p>
          </div>

          <div className="space-y-4">
            {ingredientes.map(ing => (
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
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>Pronto?</strong> Volte ao chat com o Claude e diga: <em>&ldquo;feito&rdquo;</em>
          </div>
        </div>
      </main>
    </div>
  )
}
