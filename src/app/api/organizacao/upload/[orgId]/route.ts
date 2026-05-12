import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MCP = (process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br').trim()

function getSupabaseWrite() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function uploadStorage(sb: ReturnType<typeof getSupabaseWrite>, orgId: string, ingrediente: string, arquivo: File): Promise<string | null> {
  const ext = arquivo.name.split('.').pop() || 'bin'
  const path = `${orgId}/${ingrediente}.${ext}`
  const bytes = await arquivo.arrayBuffer()
  const { error } = await sb.storage
    .from('organizacao-assets')
    .upload(path, bytes, { contentType: arquivo.type, upsert: true })
  if (error) { console.error('storage upload error:', error.message); return null }
  return path
}

async function salvarDoc(
  orgId: string, ingrediente: string,
  conteudo_md: string | null, arquivo_original: string | null,
  tamanho_bytes: number | null, storage_path: string | null
) {
  const { error } = await getSupabaseWrite()
    .from('organizacao_docs')
    .upsert({
      organizacao_id: orgId,
      ingrediente,
      status: 'pronto',
      arquivo_original: arquivo_original || null,
      conteudo_md: conteudo_md || null,
      tamanho_bytes: tamanho_bytes || null,
      storage_path: storage_path || null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'organizacao_id,ingrediente' })
  return error
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const { orgId } = params
  const token = req.headers.get('authorization') || ''
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''

  // Multipart: arquivo para converter via MarkItDown no MCP server
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const ingrediente = formData.get('ingrediente') as string
    const arquivo = formData.get('arquivo') as File | null

    if (!ingrediente || !arquivo) {
      return NextResponse.json({ error: 'ingrediente e arquivo obrigatórios' }, { status: 400 })
    }

    const MAX_BYTES = 4 * 1024 * 1024
    if (arquivo.size > MAX_BYTES) {
      return NextResponse.json({
        error: `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). Máx. 4 MB.`
      }, { status: 413 })
    }

    const sb = getSupabaseWrite()

    // Converter via MCP e salvar no Storage em paralelo
    const form = new FormData()
    form.append('arquivo', arquivo)

    const [mcpRes, storagePath] = await Promise.all([
      fetch(`${MCP}/api/ferramentas/converter-arquivo`, {
        method: 'POST',
        headers: { authorization: token },
        body: form,
      }),
      uploadStorage(sb, orgId, ingrediente, arquivo),
    ])

    let mcpData: { sucesso?: boolean; conteudo_md?: string | null; error?: string } = {}
    try {
      mcpData = await mcpRes.json()
    } catch {
      return NextResponse.json({ error: `MCP indisponível (${mcpRes.status})` }, { status: 502 })
    }

    if (!mcpData.sucesso) {
      return NextResponse.json({ error: mcpData.error || 'Falha na conversão' }, { status: 500 })
    }

    const error = await salvarDoc(orgId, ingrediente, mcpData.conteudo_md ?? null, arquivo.name, arquivo.size, storagePath)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      status: 'pronto',
      preview: mcpData.conteudo_md?.slice(0, 300) || arquivo.name,
    })
  }

  // JSON: texto já convertido client-side (docx, doc, xlsx)
  const body = await req.json()
  if (!body.ingrediente) {
    return NextResponse.json({ error: 'ingrediente obrigatório' }, { status: 400 })
  }

  const error = await salvarDoc(orgId, body.ingrediente, body.conteudo_md || null, body.arquivo_original || null, body.tamanho_bytes || null, null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    status: 'pronto',
    preview: body.conteudo_md?.slice(0, 300) || body.arquivo_original || '',
  })
}
