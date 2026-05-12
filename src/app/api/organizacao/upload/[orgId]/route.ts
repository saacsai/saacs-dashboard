import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MCP = (process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br').trim()

function getSupabaseWrite() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function salvarDoc(orgId: string, ingrediente: string, conteudo_md: string | null, arquivo_original: string | null, tamanho_bytes: number | null) {
  console.log('[salvarDoc] orgId:', orgId, 'ingrediente:', ingrediente)
  const { error } = await getSupabaseWrite()
    .from('organizacao_docs')
    .upsert({
      organizacao_id: orgId,
      ingrediente,
      status: 'pronto',
      arquivo_original: arquivo_original || null,
      conteudo_md: conteudo_md || null,
      tamanho_bytes: tamanho_bytes || null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'organizacao_id,ingrediente' })
  if (error) console.log('[salvarDoc] error:', error.message, error.code)
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

    // Repassar ao MCP para conversão com MarkItDown
    const form = new FormData()
    form.append('arquivo', arquivo)

    const mcpRes = await fetch(`${MCP}/api/ferramentas/converter-arquivo`, {
      method: 'POST',
      headers: { authorization: token },
      body: form,
    })

    let mcpData: { sucesso?: boolean; conteudo_md?: string | null; error?: string } = {}
    try {
      mcpData = await mcpRes.json()
    } catch {
      return NextResponse.json({ error: `MCP indisponível (${mcpRes.status})` }, { status: 502 })
    }

    if (!mcpData.sucesso) {
      return NextResponse.json({ error: mcpData.error || 'Falha na conversão' }, { status: 500 })
    }

    const error = await salvarDoc(orgId, ingrediente, mcpData.conteudo_md ?? null, arquivo.name, arquivo.size)
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

  const error = await salvarDoc(orgId, body.ingrediente, body.conteudo_md || null, body.arquivo_original || null, body.tamanho_bytes || null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    status: 'pronto',
    preview: body.conteudo_md?.slice(0, 300) || body.arquivo_original || '',
  })
}
