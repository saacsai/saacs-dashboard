import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const PRICE_TIER: Record<string, string> = {
  price_1TTUK8FJk3hY5VQ6aWc1wXXW: 'standard',
  price_1TTUMxFJk3hY5VQ6rcAFwLrg: 'standard',
  price_1TTUNNFJk3hY5VQ6OTryd64n: 'standard',
  price_1TTUUQFJk3hY5VQ6a5ZR5GWK: 'paid_pro',
  price_1TTUSZFJk3hY5VQ6BCm2kgVa: 'paid_pro',
  price_1TTUUQFJk3hY5VQ6kQG0pQOq: 'paid_pro',
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function setTierByEmail(email: string, tier: string) {
  const supabase = supabaseAdmin()
  const { data: client } = await supabase
    .from('clients').select('id').eq('email', email).single()
  if (client?.id) {
    await supabase.from('clients').update({ tier }).eq('id', client.id)
  }
}

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
    return customer.email ?? null
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
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const priceId = invoice.lines.data[0]?.price?.id
        const tier = priceId ? (PRICE_TIER[priceId] ?? null) : null
        if (!tier) break
        const customerId = invoice.customer as string
        const email = await getCustomerEmail(stripe, customerId)
        if (email) await setTierByEmail(email, tier)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const email = await getCustomerEmail(stripe, sub.customer as string)
        if (email) await setTierByEmail(email, 'free')
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const tier = priceId ? (PRICE_TIER[priceId] ?? null) : null
        if (!tier) break
        const email = await getCustomerEmail(stripe, sub.customer as string)
        if (email) await setTierByEmail(email, tier)
        break
      }
    }
  } catch (e) {
    console.error('Webhook error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

