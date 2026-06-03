import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS } from '@/types'

const VerifySchema = z.object({
  embed_key: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: badge, error } = await supabase
    .from('badge_embeds')
    .select('*, organizations(name, plan, coverage_limit)')
    .eq('embed_key', parsed.data.embed_key)
    .eq('active', true)
    .single()

  if (error || !badge) {
    return NextResponse.json({ verified: false }, { status: 404 })
  }

  const org = Array.isArray(badge.organizations) ? badge.organizations[0] : badge.organizations
  const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[planKey]

  return NextResponse.json({
    verified: true,
    org_name: org?.name || 'Protected Organization',
    plan: org?.plan || 'none',
    coverage_limit: org?.coverage_limit || limits.coverage,
    per_incident_limit: limits.per_incident,
    covered_events: [
      'Unauthorized financial transactions caused by agent errors',
      'Data exposure incidents caused by agent actions',
      'Incorrect advice or recommendations resulting in financial loss',
      'Erroneous automated actions causing measurable harm',
    ],
    exclusions: [
      'Intentional misuse of the AI system',
      'Pre-existing conditions or known vulnerabilities not disclosed',
      'Claims submitted after the policy expiration date',
    ],
  })
}
