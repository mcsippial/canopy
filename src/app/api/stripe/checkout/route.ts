import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse } from '@/lib/auth'

const CheckoutSchema = z.object({
  plan: z.enum(['starter', 'growth']),
})

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'billing'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid plan')

  const priceId = parsed.data.plan === 'starter'
    ? process.env.STRIPE_STARTER_PRICE_ID
    : process.env.STRIPE_GROWTH_PRICE_ID

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const supabase = createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', membership.org_id)
      .single()

    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name,
        metadata: { org_id: membership.org_id },
      })
      customerId = customer.id

      const adminClient = createAdminClient()
      await adminClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', membership.org_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing`,
      metadata: {
        org_id: membership.org_id,
        plan: parsed.data.plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
