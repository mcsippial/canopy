import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse, forbiddenResponse } from '@/lib/auth'
import { runUnderwriting } from '@/lib/underwriting'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return forbiddenResponse('Only admins can run underwriting')
  }

  const supabase = createClient()

  const { data: agent, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', membership.org_id)
    .single()

  if (fetchError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (agent.risk_score === null || agent.risk_score === undefined) {
    return NextResponse.json({ error: 'Agent must be risk scored before underwriting' }, { status: 400 })
  }

  const decision = runUnderwriting(agent)

  // Insert underwriting decision
  const { data: underwritingRecord, error: insertError } = await supabase
    .from('underwriting_decisions')
    .insert({
      org_id: membership.org_id,
      agent_id: params.id,
      decision: decision.decision,
      eligible: decision.eligible,
      recommended_plan: decision.recommended_plan,
      per_agent_sublimit: decision.per_agent_sublimit,
      per_incident_limit: decision.per_incident_limit,
      deductible: decision.deductible,
      exclusions: decision.exclusions,
      conditions: decision.conditions,
      underwriting_basis: decision.underwriting_basis,
      risk_score_locked: agent.risk_score,
      locked_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError || !underwritingRecord) {
    return serverErrorResponse('Failed to store underwriting decision')
  }

  // Update agent with underwriting status and lock risk score
  const { data: updatedAgent, error: updateError } = await supabase
    .from('agents')
    .update({
      underwriting_status: decision.decision,
      current_underwriting_id: underwritingRecord.id,
      risk_score_locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) return serverErrorResponse()

  // Create alert if agent was declined
  if (decision.decision === 'declined') {
    await supabase.from('alerts').insert({
      org_id: membership.org_id,
      agent_id: params.id,
      alert_type: 'agent_flagged',
      severity: 'critical',
      title: `Agent declined for coverage: ${agent.name}`,
      message: `Underwriting decision: declined. The agent does not meet eligibility requirements for coverage.`,
      action_url: '/dashboard/agents',
      metadata: { agent_id: params.id, decision: decision.decision },
    })
  }

  return NextResponse.json({
    agent: updatedAgent,
    underwriting: underwritingRecord,
    decision,
  })
}
