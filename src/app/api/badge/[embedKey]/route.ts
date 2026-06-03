import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const COVERED_EVENT_SUMMARY = [
  'Financial losses caused by AI agent errors or incorrect outputs',
  'Losses from unintended actions taken by covered AI agents',
  'Remediation and notification costs following a covered AI incident',
]

function maskPolicyNumber(policyNumber: string): string {
  // e.g. CNP-2026-ABCD1234 → CNP-2026-****
  const parts = policyNumber.split('-')
  if (parts.length >= 3) {
    return parts.slice(0, 2).join('-') + '-****'
  }
  return policyNumber.slice(0, 4) + '****'
}

export async function GET(req: NextRequest, { params }: { params: { embedKey: string } }) {
  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://canopy-lyart.vercel.app'
  const embedKey = params.embedKey

  const verifyUrl = `${appUrl}/verify/${embedKey}`
  const claimUrl = `${appUrl}/claim/${embedKey}`

  // 1. Look up badge_embed by embed_key
  const { data: badge, error } = await supabase
    .from('badge_embeds')
    .select('*, organizations(id, name)')
    .eq('embed_key', embedKey)
    .single()

  // 2. If not found or not active: return inactive
  if (error || !badge || !badge.active) {
    return NextResponse.json({ active: false, coverage_status: 'inactive' })
  }

  const org = Array.isArray(badge.organizations) ? badge.organizations[0] : badge.organizations
  const orgDisplayName: string = org?.name || 'Protected Organization'

  // Update last_used_at (fire and forget)
  supabase
    .from('badge_embeds')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', badge.id)
    .then(() => {})

  // 3. Look up org's active policy_document
  const { data: policy } = await supabase
    .from('policy_documents')
    .select('policy_number, aggregate_limit, per_incident_limit, effective_at, expires_at, status')
    .eq('org_id', org.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 4. No active policy → pending
  if (!policy) {
    return NextResponse.json({
      active: false,
      coverage_status: 'pending',
      org_display_name: orgDisplayName,
      embed_key: embedKey,
      verify_url: verifyUrl,
      claim_url: claimUrl,
    })
  }

  // 5. Active policy → full public data
  return NextResponse.json({
    active: true,
    coverage_status: 'active',
    org_display_name: orgDisplayName,
    per_incident_limit: policy.per_incident_limit ?? null,
    aggregate_limit: policy.aggregate_limit ?? null,
    policy_number_masked: policy.policy_number ? maskPolicyNumber(policy.policy_number) : null,
    covered_event_summary: COVERED_EVENT_SUMMARY,
    policy_expires_at: policy.expires_at ? policy.expires_at.slice(0, 10) : null,
    embed_key: embedKey,
    verify_url: verifyUrl,
    claim_url: claimUrl,
  })
}
