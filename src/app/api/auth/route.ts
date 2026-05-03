import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pid, cpf, email } = body

    if (!pid) return NextResponse.json({ error: 'pid obrigatório' }, { status: 400 })
    if (!cpf && !email) return NextResponse.json({ error: 'cpf ou email obrigatório' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: projeto, error: projErr } = await supabase
      .from('tlp_projetos')
      .select('id, client_id, oauth_client_id, oauth_client_secret')
      .eq('id', pid)
      .single()

    if (projErr || !projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    }

    if (projeto.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('cpf, email')
        .eq('id', projeto.client_id)
        .single()

      if (email) {
        // Autenticação via Supabase Auth — verifica se email bate com o projeto
        if (clientData?.email && clientData.email !== email) {
          return NextResponse.json({ error: 'Este projeto não pertence a este usuário.' }, { status: 403 })
        }
      } else {
        // Autenticação legada via CPF
        const cpfNum = cpf.replace(/\D/g, '')
        const cpfCadastrado = clientData?.cpf?.replace(/\D/g, '')
        if (cpfCadastrado && cpfCadastrado !== cpfNum) {
          return NextResponse.json({ error: 'CPF não corresponde ao projeto.' }, { status: 401 })
        }
      }
    }

    const mcpUrl = (process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br').trim()
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
      const errBody = await tokenRes.text()
      return NextResponse.json({ error: `Erro MCP: ${errBody}` }, { status: 502 })
    }

    const { access_token } = await tokenRes.json()
    return NextResponse.json({ access_token, oauth_client_id: projeto.oauth_client_id })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
