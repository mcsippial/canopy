import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export async function POST(_req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'billing'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const supabase = createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', membership.org_id)
      .single()

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
