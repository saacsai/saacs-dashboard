import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseRead() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseWrite() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function getProjectAndClientId(req: NextRequest): Promise<{ projectId: string; clientId: string } | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    const projectId = payload.project_id
    if (!projectId) return null
    const { data } = await getSupabaseRead()
      .from('tlp_projetos')
      .select('client_id')
      .eq('id', projectId)
      .single()
    if (!data?.client_id) return null
    return { projectId, clientId: data.client_id }
  } catch { return null }
}

// GET — carrega org e docs para o projeto autenticado
export async function GET(req: NextRequest) {
  const ids = await getProjectAndClientId(req)
  if (!ids) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sb = getSupabaseRead()

  const { data: proj } = await sb
    .from('tlp_projetos')
    .select('organizacao_id')
    .eq('id', ids.projectId)
    .single()

  if (!proj?.organizacao_id) {
    return NextResponse.json({ org: null, docs: [] })
  }

  const [{ data: org }, { data: docs }] = await Promise.all([
    sb.from('organizacoes').select('*').eq('id', proj.organizacao_id).single(),
    sb.from('organizacao_docs').select('*').eq('organizacao_id', proj.organizacao_id),
  ])

  return NextResponse.json({ org, docs: docs || [] })
}

// POST — cria organização e vincula ao projeto
export async function POST(req: NextRequest) {
  const ids = await getProjectAndClientId(req)
  if (!ids) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const sb = getSupabaseWrite()

  const { data: org, error } = await sb
    .from('organizacoes')
    .insert({
      client_id: ids.clientId,
      nome_fantasia: body.nome_fantasia || null,
      razao_social: body.razao_social || null,
      cnpj: body.cnpj || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Vincula o projeto à org criada
  await sb
    .from('tlp_projetos')
    .update({ organizacao_id: org.id })
    .eq('id', ids.projectId)

  return NextResponse.json({ org })
}

// PATCH — atualiza campos da organização
export async function PATCH(req: NextRequest) {
  const ids = await getProjectAndClientId(req)
  if (!ids) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { orgId, ...fields } = body

  if (!orgId) return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })

  // Remove campos que não devem ser atualizados via PATCH
  const { id: _id, client_id: _cid, created_at: _ca, ...updateData } = fields

  const { data: org, error } = await getSupabaseWrite()
    .from('organizacoes')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ org })
}
