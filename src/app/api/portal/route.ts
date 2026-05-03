import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 })

    const email = await getClientEmail(req)
    if (!email) return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 })

    const stripe = new Stripe(secretKey)

    const customers = await stripe.customers.list({ email, limit: 1 })
    if (!customers.data.length) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada para este email.' }, { status: 404 })
    }

    const origin = req.headers.get('origin') || 'https://dashboard.saacs.com.br'
    const { searchParams } = new URL(req.url)
    const pid = searchParams.get('pid') || ''
    const returnUrl = pid ? `${origin}/tilapia?pid=${pid}` : `${origin}/tilapia`

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
