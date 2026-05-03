import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const PRICES: Record<string, string> = {
  standard_mensal:      'price_1TT1fQFR1kh8rsATTdStIKDN',
  standard_trimestral:  'price_1TT1gOFR1kh8rsATcDiLPQ5r',
  standard_anual:       'price_1TT1hhFR1kh8rsATcA6ncpYJ',
  pro_mensal:           'price_1TT0zZFR1kh8rsATsYaHMw9i',
  pro_trimestral:       'price_1TT0yXFR1kh8rsAT8G1YLy3v',
  pro_anual:            'price_1TT0w4FR1kh8rsATkO4M3rvN',
}

function getProjectId(req: NextRequest): string | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.project_id ?? null
  } catch { return null }
}

async function getClientInfo(projectId: string): Promise<{ email: string | null; clientId: string | null }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: proj } = await supabase
      .from('tlp_projetos').select('client_id').eq('id', projectId).single()
    if (!proj?.client_id) return { email: null, clientId: null }
    const { data: client } = await supabase
      .from('clients').select('email').eq('id', proj.client_id).single()
    return { email: client?.email ?? null, clientId: proj.client_id }
  } catch { return { email: null, clientId: null } }
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 })

    const { plano } = await req.json().catch(() => ({ plano: 'standard_mensal' }))
    const priceId = PRICES[plano]
    if (!priceId) return NextResponse.json({ error: `Plano inválido: ${plano}` }, { status: 400 })

    const origin = req.headers.get('origin') || 'https://dashboard.saacs.com.br'
    const pid = getProjectId(req)
    const { email, clientId } = pid ? await getClientInfo(pid) : { email: null, clientId: null }
    const pidParam = pid ? `&pid=${pid}` : ''

    const stripe = new Stripe(secretKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      ...(clientId ? { client_reference_id: clientId } : {}),
      success_url: `${origin}/tilapia?upgrade=success${pidParam}&session_id=` + '{CHECKOUT_SESSION_ID}',
      cancel_url: `${origin}/tilapia?upgrade=cancelled${pidParam}`,
      locale: 'pt-BR',
      payment_method_types: ['card'],
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
