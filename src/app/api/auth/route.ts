import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { pid, cpf } = await req.json()

    if (!pid || !cpf) {
      return NextResponse.json({ error: 'pid e cpf obrigatórios' }, { status: 400 })
    }

    const cpfNum = cpf.replace(/\D/g, '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Buscar projeto
    const { data: projeto, error: projErr } = await supabase
      .from('tlp_projetos')
      .select('id, client_id, oauth_client_id, oauth_client_secret')
      .eq('id', pid)
      .single()

    if (projErr || !projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    }

    // Verificar CPF se projeto tem client_id
    if (projeto.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('cpf')
        .eq('id', projeto.client_id)
        .single()

      const cpfCadastrado = clientData?.cpf?.replace(/\D/g, '')
      if (cpfCadastrado && cpfCadastrado !== cpfNum) {
        return NextResponse.json({ error: 'CPF não corresponde ao projeto.' }, { status: 401 })
      }
    }

    // Trocar por token via MCP (server-to-server, sem CORS)
    const mcpUrl = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br'
    const tokenRes = await fetch(`${mcpUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: projeto.oauth_client_id,
        client_secret: projeto.oauth_client_secret,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      return NextResponse.json({ error: `Erro MCP: ${body}` }, { status: 502 })
    }

    const { access_token } = await tokenRes.json()
    return NextResponse.json({
      access_token,
      oauth_client_id: projeto.oauth_client_id,
    })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
