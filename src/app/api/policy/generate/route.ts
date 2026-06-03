import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse, forbiddenResponse } from '@/lib/auth'
import { generatePolicy } from '@/lib/policyGenerator'

export async function POST(_req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return forbiddenResponse('Only admins can generate policies')
  }

  const org = (membership.organizations as unknown) as { id: string; name: string; plan: string }

  const supabase = createClient()

  // Get all approved agents with their underwriting decisions
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select(`
      id,
      name,
      type,
      model_name,
      risk_score,
      risk_score_locked_at,
      underwriting_status,
      current_underwriting_id
    `)
    .eq('org_id', membership.org_id)
    .eq('underwriting_status', 'approved')

  if (agentsError) return serverErrorResponse()

  if (!agents || agents.length === 0) {
    return NextResponse.json(
      { error: 'No approved agents found. At least one agent must be underwritten and approved before generating a policy.' },
      { status: 400 }
    )
  }

  // Fetch underwriting decisions for each approved agent
  const underwritingIds = agents
    .map((a) => a.current_underwriting_id)
    .filter(Boolean)

  const { data: decisions, error: decisionsError } = await supabase
    .from('underwriting_decisions')
    .select('*')
    .in('id', underwritingIds)

  if (decisionsError) return serverErrorResponse()

  const decisionMap = new Map((decisions ?? []).map((d) => [d.agent_id, d]))

  const approvedAgents = agents
    .map((agent) => {
      const decision = decisionMap.get(agent.id)
      if (!decision) return null
      return {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_type: agent.type,
        model_name: agent.model_name ?? 'Unknown',
        underwriting_decision: {
          eligible: decision.eligible,
          decision: decision.decision,
          reason: (decision.underwriting_basis as Record<string, unknown>)?.reason as string ?? '',
          recommended_plan: decision.recommended_plan,
          per_agent_sublimit: Number(decision.per_agent_sublimit),
          per_incident_limit: Number(decision.per_incident_limit),
          deductible: Number(decision.deductible),
          exclusions: (decision.exclusions as string[]) ?? [],
          conditions: (decision.conditions as string[]) ?? [],
          underwriting_basis: decision.underwriting_basis as Record<string, unknown>,
        },
        risk_score_at_issuance: decision.risk_score_locked ?? agent.risk_score ?? 0,
        score_locked_at: decision.locked_at,
      }
    })
    .filter(Boolean) as Parameters<typeof generatePolicy>[0]['approved_agents']

  const plan = (org.plan as 'starter' | 'growth' | 'enterprise') ?? 'starter'
  const validPlan = ['starter', 'growth', 'enterprise'].includes(plan) ? plan : 'starter'

  const policyDocument = generatePolicy({
    org_id: membership.org_id,
    org_name: org.name,
    approved_agents: approvedAgents,
    plan: validPlan as 'starter' | 'growth' | 'enterprise',
  })

  // Store policy document
  const { data: savedPolicy, error: saveError } = await supabase
    .from('policy_documents')
    .insert({
      org_id: membership.org_id,
      policy_number: policyDocument.policy_number,
      status: 'active',
      document: policyDocument as unknown as Record<string, unknown>,
      aggregate_limit: policyDocument.aggregate_limit,
      per_incident_limit: policyDocument.per_incident_limit,
      premium_monthly: policyDocument.premium_monthly,
      effective_at: policyDocument.effective_at,
      expires_at: policyDocument.expires_at,
      issued_at: policyDocument.issued_at,
    })
    .select()
    .single()

  if (saveError || !savedPolicy) {
    return serverErrorResponse('Failed to save policy document')
  }

  return NextResponse.json({ policy: savedPolicy, document: policyDocument })
}
