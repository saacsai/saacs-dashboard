import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Retorna os projetos de um usuário por email
export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: client } = await supabase
    .from('clients').select('id').eq('email', email).single()
  if (!client?.id) return NextResponse.json({ projects: [] })

  const { data: projects } = await supabase
    .from('tlp_projetos')
    .select('id, tipo, mise_en_place_concluido')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ projects: projects || [] })
}
