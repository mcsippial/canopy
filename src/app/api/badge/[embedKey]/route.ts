import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS } from '@/types'

export async function GET(req: NextRequest, { params }: { params: { embedKey: string } }) {
  const supabase = createAdminClient()

  const { data: badge, error } = await supabase
    .from('badge_embeds')
    .select('*, organizations(name, plan, coverage_limit, covered_users_limit)')
    .eq('embed_key', params.embedKey)
    .eq('active', true)
    .single()

  if (error || !badge) {
    return NextResponse.json({ error: 'Badge not found or inactive' }, { status: 404 })
  }

  // Update last used
  await supabase.from('badge_embeds').update({ last_used_at: new Date().toISOString() }).eq('id', badge.id)

  const org = Array.isArray(badge.organizations) ? badge.organizations[0] : badge.organizations
  const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[planKey]

  // Return only safe public fields
  return NextResponse.json({
    org_name: org?.name || 'Protected Organization',
    plan: org?.plan || 'none',
    coverage_limit: org?.coverage_limit || limits.coverage,
    per_incident_limit: limits.per_incident,
    embed_key: params.embedKey,
    active: badge.active,
  })
}
