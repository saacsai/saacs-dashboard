import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseWrite() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// POST — salva documento da organização no organizacao_docs
// Body: { ingrediente, conteudo_md, arquivo_original, tamanho_bytes }
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const { orgId } = params
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  if (!body.ingrediente) {
    return NextResponse.json({ error: 'ingrediente obrigatório' }, { status: 400 })
  }

  const { data, error } = await getSupabaseWrite()
    .from('organizacao_docs')
    .upsert({
      organizacao_id: orgId,
      ingrediente: body.ingrediente,
      status: 'pronto',
      arquivo_original: body.arquivo_original || null,
      conteudo_md: body.conteudo_md || null,
      tamanho_bytes: body.tamanho_bytes || null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'organizacao_id,ingrediente' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    status: 'pronto',
    preview: body.conteudo_md?.slice(0, 300) || body.arquivo_original || '',
  })
}
