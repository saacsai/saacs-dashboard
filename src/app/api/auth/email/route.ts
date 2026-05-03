import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Retorna o email do cliente a partir do pid — usado na página de login
export async function GET(req: NextRequest) {
  const pid = new URL(req.url).searchParams.get('pid')
  if (!pid) return NextResponse.json({ error: 'pid obrigatório' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: proj } = await supabase
    .from('tlp_projetos').select('client_id').eq('id', pid).single()
  if (!proj?.client_id) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const { data: client } = await supabase
    .from('clients').select('email').eq('id', proj.client_id).single()
  if (!client?.email) return NextResponse.json({ error: 'Cliente sem email' }, { status: 404 })

  return NextResponse.json({ email: client.email })
}
