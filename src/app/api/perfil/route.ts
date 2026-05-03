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

async function getClientId(req: NextRequest): Promise<string | null> {
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
    return data?.client_id ?? null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await getSupabaseRead()
    .from('clients')
    .select('nome, sobrenome, cpf, email, whatsapp, cnpj, atividade')
    .eq('id', clientId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  // CPF e email são read-only
  const { cpf: _cpf, email: _email, ...updateData } = body

  const { error } = await getSupabaseWrite()
    .from('clients')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
