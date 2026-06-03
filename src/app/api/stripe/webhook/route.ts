import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS } from '@/types'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID || '']: 'starter',
  [process.env.STRIPE_GROWTH_PRICE_ID || '']: 'growth',
}

async function getPlanFromSubscription(stripe: Stripe, subscription: Stripe.Subscription): Promise<string> {
  const priceId = subscription.items.data[0]?.price.id
  return PRICE_TO_PLAN[priceId] || 'none'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Store event
  await supabase.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  const stripe = getStripe()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const orgId = session.metadata?.org_id
        const plan = session.metadata?.plan
        if (!orgId || !plan) break

        const planKey = plan as keyof typeof PLAN_LIMITS
        const limits = PLAN_LIMITS[planKey]

        await supabase.from('organizations').update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          coverage_limit: limits.coverage,
          covered_users_limit: limits.users === Infinity ? null : limits.users,
          updated_at: new Date().toISOString(),
        }).eq('id', orgId)

        // Create/update policy
        await supabase.from('policies').upsert({
          org_id: orgId,
          plan: plan as 'starter' | 'growth' | 'enterprise',
          coverage_limit: limits.coverage,
          per_incident_limit: limits.per_incident,
          premium_monthly: limits.monthly,
          status: 'active',
          effective_at: new Date().toISOString(),
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!org) break

        const plan = await getPlanFromSubscription(stripe, subscription)
        const planKey = plan as keyof typeof PLAN_LIMITS
        const limits = PLAN_LIMITS[planKey]

        const status = subscription.status === 'active' ? 'active' : 'pending'

        await supabase.from('organizations').update({
          plan: subscription.status === 'active' ? plan : 'none',
          coverage_limit: limits.coverage,
          covered_users_limit: limits.users === Infinity ? null : limits.users,
          updated_at: new Date().toISOString(),
        }).eq('id', org.id)

        await supabase.from('policies').update({
          status,
          updated_at: new Date().toISOString(),
        }).eq('org_id', org.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!org) break

        await supabase.from('organizations').update({
          plan: 'none',
          stripe_subscription_id: null,
          coverage_limit: null,
          covered_users_limit: null,
          updated_at: new Date().toISOString(),
        }).eq('id', org.id)

        await supabase.from('policies').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('org_id', org.id).eq('status', 'active')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (org) {
          await supabase.from('policies').update({
            status: 'pending',
            updated_at: new Date().toISOString(),
          }).eq('org_id', org.id).eq('status', 'active')
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
