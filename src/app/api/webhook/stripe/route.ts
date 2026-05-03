import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Mapeamento price_id → tier no Supabase
const PRICE_TIER: Record<string, string> = {
  price_1TT1fQFR1kh8rsATTdStIKDN: 'standard',
  price_1TT1gOFR1kh8rsATcDiLPQ5r: 'standard',
  price_1TT1hhFR1kh8rsATcA6ncpYJ: 'standard',
  price_1TT0zZFR1kh8rsATsYaHMw9i: 'paid_pro',
  price_1TT0yXFR1kh8rsAT8G1YLy3v: 'paid_pro',
  price_1TT0w4FR1kh8rsATkO4M3rvN: 'paid_pro',
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function setTier(clientId: string, tier: string) {
  const supabase = supabaseAdmin()
  await supabase.from('clients').update({ tier }).eq('id', clientId)
}

async function getTierFromSubscription(stripe: Stripe, subscriptionId: string): Promise<string | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = sub.items.data[0]?.price.id
    return priceId ? (PRICE_TIER[priceId] ?? null) : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET não configurada' }, { status: 500 })

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    const stripe = new Stripe(secretKey)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Webhook inválido: ${msg}` }, { status: 400 })
  }

  const stripe = new Stripe(secretKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clientId = session.client_reference_id
        if (!clientId) break
        const subscriptionId = session.subscription as string
        const tier = await getTierFromSubscription(stripe, subscriptionId)
        if (tier) await setTier(clientId, tier)
        break
      }

      case 'customer.subscription.deleted': {
        // Assinatura cancelada → volta para free
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        // Busca client via stripe_customer_id ou email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email
        if (!email) break
        const supabase = supabaseAdmin()
        const { data: client } = await supabase
          .from('clients').select('id').eq('email', email).single()
        if (client?.id) await setTier(client.id, 'free')
        break
      }

      case 'customer.subscription.updated': {
        // Plano alterado (upgrade/downgrade via portal)
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const newTier = priceId ? (PRICE_TIER[priceId] ?? null) : null
        if (!newTier) break
        const customerId = sub.customer as string
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email
        if (!email) break
        const supabase = supabaseAdmin()
        const { data: client } = await supabase
          .from('clients').select('id').eq('email', email).single()
        if (client?.id) await setTier(client.id, newTier)
        break
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Webhook handler error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Stripe exige o body raw — desabilita o bodyParser do Next.js
export const config = { api: { bodyParser: false } }
