import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TSxg0FR1kh8rsAT2xkOxEY6'

async function getClientEmail(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    const projectId = payload.project_id
    if (!projectId) return null

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
  const email = await getClientEmail(req)
  const origin = req.headers.get('origin') || 'https://dashboard.saacs.com.br'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    ...(email ? { customer_email: email } : {}),
    success_url: `${origin}/tilapia?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/tilapia?upgrade=cancelled`,
    locale: 'pt-BR',
    payment_method_types: ['card'],
  })

  return NextResponse.json({ url: session.url })
}
