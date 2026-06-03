import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'
import { triageClaim, checkCoverage, type CoverageCheckResult } from '@/lib/ai'
import { sendClaimConfirmation, sendClaimAlert } from '@/lib/email'
import { PLAN_LIMITS } from '@/types'
import type { PolicyDocument } from '@/lib/policyGenerator'

const PublicClaimSchema = z.object({
  embed_key: z.string().min(1),
  claimant_name: z.string().min(1).max(100),
  claimant_email: z.string().email(),
  incident_date: z.string().optional(),
  description: z.string().min(10).max(5000),
  financial_impact_description: z.string().max(2000).optional(),
  amount_claimed: z.number().positive(),
  agent_id: z.string().uuid().optional(),
  // New fields
  error_started_at: z.string().optional(),
  error_detected_at: z.string().optional(),
  actions_during_incident: z.number().int().positive().optional(),
  tokens_consumed_during_incident: z.number().int().positive().optional(),
  model_at_time_of_incident: z.string().max(100).optional(),
  error_repeated: z.boolean().optional(),
})

function generateClaimNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CLM-${year}-${random}`
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = PublicClaimSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createAdminClient()

  // Validate embed key
  const { data: badge, error: badgeError } = await supabase
    .from('badge_embeds')
    .select('*, organizations(*)')
    .eq('embed_key', parsed.data.embed_key)
    .eq('active', true)
    .single()

  if (badgeError || !badge) {
    return NextResponse.json({ error: 'Invalid or inactive embed key' }, { status: 400 })
  }

  const org = Array.isArray(badge.organizations) ? badge.organizations[0] : badge.organizations

  // Fetch active policy_document for coverage check
  const { data: activePolicyDoc } = await supabase
    .from('policy_documents')
    .select('*')
    .eq('org_id', badge.org_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch agent if provided
  let agentData: {
    name?: string
    type?: string
    description?: string
    created_at?: string
    avg_tokens_per_action?: number
    max_actions_per_day?: number
    uses_tool_calls?: boolean
    detection_lag_minutes?: number
    underwriting_status?: string
  } | null = null

  if (parsed.data.agent_id) {
    const { data } = await supabase
      .from('agents')
      .select('type, description, created_at, avg_tokens_per_action, max_actions_per_day, uses_tool_calls, detection_lag_minutes, underwriting_status')
      .eq('id', parsed.data.agent_id)
      .single()
    agentData = data
  }

  // Fetch total approved claims for aggregate limit check
  const { data: approvedClaims } = await supabase
    .from('claims')
    .select('amount_approved')
    .eq('org_id', badge.org_id)
    .in('status', ['approved', 'paid'])

  const existingApproved = (approvedClaims || []).reduce(
    (sum, c) => sum + (Number(c.amount_approved) || 0),
    0
  )

  // Run coverage check using policy_documents
  const policyDocForCheck = activePolicyDoc ? {
    id: activePolicyDoc.id as string,
    policy_number: activePolicyDoc.policy_number as string,
    status: activePolicyDoc.status as string,
    aggregate_limit: Number(activePolicyDoc.aggregate_limit),
    per_incident_limit: Number(activePolicyDoc.per_incident_limit),
    effective_at: activePolicyDoc.effective_at as string | null,
    expires_at: activePolicyDoc.expires_at as string | null,
    document: activePolicyDoc.document as { covered_agents?: Array<{ agent_id: string; sublimit: number; deductible: number }> },
  } : null

  const coverageResult: CoverageCheckResult = await checkCoverage({
    org_id: badge.org_id,
    agent_id: parsed.data.agent_id,
    amount_claimed: parsed.data.amount_claimed,
    incident_date: parsed.data.incident_date,
    error_started_at: parsed.data.error_started_at,
    policyDocument: policyDocForCheck,
    agentUnderwritingStatus: agentData?.underwriting_status,
    existing_approved_claims_total: existingApproved,
  })

  // Determine claim status based on coverage eligibility
  const claimStatus = coverageResult.coverage_eligible ? 'submitted' : 'under_review'

  // Build denial note for initial status event
  const initialEventMessage = coverageResult.coverage_eligible
    ? 'Your claim has been received and is being reviewed.'
    : `Your claim has been received and is under review. Coverage check identified the following issue(s): ${coverageResult.denial_reasons.join('; ')}`

  // Compute damage_multiplier
  let damageMultiplier: number | null = null
  if (parsed.data.actions_during_incident && agentData?.avg_tokens_per_action) {
    let windowHours = 1
    if (parsed.data.error_started_at && parsed.data.error_detected_at) {
      const start = new Date(parsed.data.error_started_at).getTime()
      const end = new Date(parsed.data.error_detected_at).getTime()
      windowHours = Math.max(1, (end - start) / (1000 * 60 * 60))
    }
    damageMultiplier = parsed.data.actions_during_incident * agentData.avg_tokens_per_action * windowHours
  }

  // Create claim
  const claimNumber = generateClaimNumber()
  const statusToken = generateToken()

  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      claim_number: claimNumber,
      public_status_token: statusToken,
      org_id: badge.org_id,
      agent_id: parsed.data.agent_id || null,
      claimant_email: parsed.data.claimant_email,
      claimant_name: parsed.data.claimant_name,
      incident_date: parsed.data.incident_date || null,
      description: parsed.data.description,
      financial_impact_description: parsed.data.financial_impact_description || null,
      amount_claimed: parsed.data.amount_claimed,
      status: claimStatus,
      ai_triage_status: 'not_started',
      error_started_at: parsed.data.error_started_at || null,
      error_detected_at: parsed.data.error_detected_at || null,
      actions_during_incident: parsed.data.actions_during_incident || null,
      tokens_consumed_during_incident: parsed.data.tokens_consumed_during_incident || null,
      model_at_time_of_incident: parsed.data.model_at_time_of_incident || null,
      damage_multiplier: damageMultiplier,
      coverage_check_result: coverageResult as unknown as Record<string, unknown>,
    })
    .select()
    .single()

  if (claimError || !claim) return serverErrorResponse('Failed to create claim')

  // Create initial status event
  await supabase.from('claim_status_events').insert({
    claim_id: claim.id,
    status: claimStatus,
    message: initialEventMessage,
    public: true,
  })

  // Update last_used_at on badge
  await supabase.from('badge_embeds').update({ last_used_at: new Date().toISOString() }).eq('id', badge.id)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Send emails
  await sendClaimConfirmation({
    to: parsed.data.claimant_email,
    claimantName: parsed.data.claimant_name,
    claimNumber,
    statusToken,
  })

  // Get org admin emails
  const { data: adminMembers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', badge.org_id)
    .in('role', ['owner', 'admin'])

  if (adminMembers && adminMembers.length > 0) {
    const adminEmails: string[] = []
    for (const member of adminMembers) {
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
      if (userData?.user?.email) adminEmails.push(userData.user.email)
    }

    if (adminEmails.length > 0) {
      let agentName: string | undefined
      if (parsed.data.agent_id) {
        const { data: agent } = await supabase.from('agents').select('name').eq('id', parsed.data.agent_id).single()
        agentName = agent?.name
      }

      await sendClaimAlert({
        adminEmails,
        claimNumber,
        amountClaimed: parsed.data.amount_claimed,
        claimantName: parsed.data.claimant_name,
        agentName,
        dashboardUrl: `${appUrl}/dashboard/claims`,
      })
    }
  }

  // Trigger AI triage (background)
  setImmediate(async () => {
    try {
      await supabase.from('claims').update({ ai_triage_status: 'processing' }).eq('id', claim.id)

      const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
      const limits = PLAN_LIMITS[planKey]

      // Extract policy terms from policy document for AI triage
      const policyDoc = activePolicyDoc?.document as PolicyDocument | undefined
      const agentEntry = policyDoc?.covered_agents?.find((a) => a.agent_id === parsed.data.agent_id)

      const policyTerms = policyDoc ? {
        covered_events: policyDoc.covered_events ?? [],
        exclusions: policyDoc.exclusions ?? [],
        conditions: policyDoc.conditions ?? [],
        per_incident_limit: Number(activePolicyDoc?.per_incident_limit ?? limits.per_incident),
        aggregate_limit: Number(activePolicyDoc?.aggregate_limit ?? limits.coverage),
        deductible: agentEntry?.deductible ?? 0,
      } : null

      const { result, error: aiError } = await triageClaim({
        description: parsed.data.description,
        financial_impact_description: parsed.data.financial_impact_description,
        amount_claimed: parsed.data.amount_claimed,
        incident_date: parsed.data.incident_date,
        agent_type: agentData?.type,
        agent_description: agentData?.description,
        coverage_limit: Number(activePolicyDoc?.aggregate_limit ?? limits.coverage),
        per_incident_limit: Number(activePolicyDoc?.per_incident_limit ?? limits.per_incident),
        error_started_at: parsed.data.error_started_at,
        error_detected_at: parsed.data.error_detected_at,
        actions_during_incident: parsed.data.actions_during_incident,
        tokens_consumed_during_incident: parsed.data.tokens_consumed_during_incident,
        model_at_time_of_incident: parsed.data.model_at_time_of_incident,
        agent_avg_tokens_per_action: agentData?.avg_tokens_per_action,
        agent_max_actions_per_day: agentData?.max_actions_per_day,
        agent_uses_tool_calls: agentData?.uses_tool_calls,
        agent_detection_lag_minutes: agentData?.detection_lag_minutes,
        coverageCheck: coverageResult,
        policyTerms,
        agentSublimit: agentEntry?.sublimit ?? null,
      })

      if (result) {
        await supabase.from('claims').update({
          ai_triage_result: result as unknown as Record<string, unknown>,
          ai_triage_status: 'completed',
        }).eq('id', claim.id)
      } else {
        await supabase.from('claims').update({ ai_triage_status: 'failed' }).eq('id', claim.id)
        console.error('AI triage failed:', aiError)
      }
    } catch (err) {
      console.error('AI triage error:', err)
      await supabase.from('claims').update({ ai_triage_status: 'failed' }).eq('id', claim.id)
    }
  })

  return NextResponse.json({
    claim_number: claimNumber,
    public_status_token: statusToken,
    status: claimStatus,
    coverage_check: {
      passed: coverageResult.coverage_eligible,
      reasons: coverageResult.denial_reasons,
    },
  }, { status: 201 })
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*, agents(name, type)')
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false })

  if (error) return serverErrorResponse()

  return NextResponse.json(data)
}
