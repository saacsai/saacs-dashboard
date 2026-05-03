import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const PRICES: Record<string, string> = {
  mensal:    'price_1TSyKhFR1kh8rsAT0Wn7ea73',
  anual:     'price_1TSyJrFR1kh8rsATCgYUcXnO',
  parcelado: 'price_1TSyJIFR1kh8rsATHjvxJnGZ',
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

async function getClientEmail(projectId: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: proj } = await supabase
      .from('tlp_projetos').select('client_id').eq('id', projectId).single()
    if (!proj?.client_id) return null
    const { data: client } = await supabase
      .from('clients').select('email').eq('id', proj.client_id).single()
    return client?.email ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 })

    const { plano } = await req.json().catch(() => ({ plano: 'mensal' }))
    const priceId = PRICES[plano] || PRICES.mensal
    const origin = req.headers.get('origin') || 'https://dashboard.saacs.com.br'
    const pid = getProjectId(req)
    const email = pid ? await getClientEmail(pid) : null
    const pidParam = pid ? `&pid=${pid}` : ''

    const stripe = new Stripe(secretKey)

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      success_url: `${origin}/tilapia?upgrade=success${pidParam}&session_id=` + '{CHECKOUT_SESSION_ID}',
      cancel_url: `${origin}/tilapia?upgrade=cancelled${pidParam}`,
      locale: 'pt-BR',
      payment_method_types: ['card'],
    }

    const session = await stripe.checkout.sessions.create(sessionData)
    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
