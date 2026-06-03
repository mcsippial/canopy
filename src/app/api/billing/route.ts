import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  const [orgRes, policyRes] = await Promise.all([
    supabase.from('organizations').select('plan, stripe_customer_id, coverage_limit, covered_users_limit').eq('id', membership.org_id).single(),
    supabase.from('policies').select('plan, status, premium_monthly, effective_at, renews_at').eq('org_id', membership.org_id).order('created_at', { ascending: false }).limit(1).single(),
  ])

  return NextResponse.json({
    org: orgRes.data,
    policy: policyRes.data || null,
  })
}
