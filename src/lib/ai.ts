import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const RiskAssessmentSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(['low', 'medium', 'high']),
  risk_factors: z.array(z.string()),
  recommendations: z.array(z.string()),
  reasoning: z.string(),
  estimated_max_incident_exposure_usd: z.number(),
  coverage_recommendation: z.string(),
  high_frequency_warning: z.boolean(),
  model_risk_note: z.string(),
})

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>

export async function scoreAgentRisk(agent: {
  name: string
  type: string
  description?: string | null
  actions_description?: string | null
  connected_systems?: string | null
  model_name?: string | null
  model_provider?: string | null
  avg_tokens_per_action?: number | null
  pricing_model?: string | null
  max_actions_per_day?: number | null
  deployment_type?: string | null
  uses_tool_calls?: boolean | null
  max_tool_call_depth?: number | null
  human_in_loop?: boolean | null
  detection_lag_minutes?: number | null
}): Promise<{ result: RiskAssessment | null; error: string | null; raw: string | null }> {
  try {
    const client = getClient()

    const userMessage = JSON.stringify({
      agent_name: agent.name,
      agent_type: agent.type,
      description: agent.description || 'Not provided',
      actions_description: agent.actions_description || 'Not provided',
      connected_systems: agent.connected_systems || 'Not provided',
      model_name: agent.model_name || 'Unknown',
      model_provider: agent.model_provider || 'Unknown',
      avg_tokens_per_action: agent.avg_tokens_per_action ?? 'Unknown',
      pricing_model: agent.pricing_model || 'Unknown',
      max_actions_per_day: agent.max_actions_per_day ?? 'Unknown',
      deployment_type: agent.deployment_type || 'Unknown',
      uses_tool_calls: agent.uses_tool_calls ?? false,
      max_tool_call_depth: agent.max_tool_call_depth ?? 0,
      human_in_loop: agent.human_in_loop ?? false,
      detection_lag_minutes: agent.detection_lag_minutes ?? 'Unknown',
    })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are Canopy's risk assessment assistant. You evaluate AI agents for liability risk scoring (0-100). Higher scores mean higher potential liability risk.

Key risk factors to consider:
- model_provider/model_name: Some models (e.g. frontier models with large context) create more verbose errors that can cascade. Older or less capable models may hallucinate more.
- avg_tokens_per_action: High token usage amplifies potential for verbose, compounding errors. Over 2,000 tokens/action is elevated risk.
- deployment_type: batch and event_driven deployments can accumulate damage before detection. realtime with human oversight is lowest risk.
- uses_tool_calls / max_tool_call_depth: Tool call chaining creates cascading failure potential. Depth > 3 is high risk.
- human_in_loop: A human checkpoint significantly reduces risk. Absence of human oversight is a major risk factor.
- detection_lag_minutes: Longer lag = more damage accumulation. >60 minutes is concerning, >240 minutes is high risk.
- max_actions_per_day: High frequency multiplies exposure. >10,000 actions/day warrants high_frequency_warning.
- connected_systems: Financial systems, email, databases, or external APIs increase blast radius.

Output valid JSON only. This is an internal recommendation, not an underwriting decision.`,
      messages: [
        {
          role: 'user',
          content: `Please assess the risk for this AI agent and return a JSON object:\n\n${userMessage}\n\nReturn only valid JSON with these exact fields:
- risk_score (integer 0-100)
- risk_level ("low", "medium", or "high")
- risk_factors (array of strings describing specific risk factors)
- recommendations (array of strings with mitigation recommendations)
- reasoning (string explaining the overall assessment)
- estimated_max_incident_exposure_usd (number, estimated worst-case single incident cost in USD)
- coverage_recommendation (string, what coverage level this agent warrants)
- high_frequency_warning (boolean, true if max_actions_per_day > 10000 or detection_lag is concerning)
- model_risk_note (string, specific notes about the model/provider risk profile)`,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { result: null, error: 'No JSON found in response', raw: rawText }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validated = RiskAssessmentSchema.safeParse(parsed)
    if (!validated.success) {
      return { result: null, error: 'Invalid response structure', raw: rawText }
    }

    return { result: validated.data, error: null, raw: rawText }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { result: null, error: message, raw: null }
  }
}

// New structured CoverageCheckResult (per spec)
export type CoverageCheckResult = {
  has_active_policy: boolean
  policy_id: string | null
  policy_number: string | null
  agent_is_covered: boolean
  agent_underwriting_status: string | null
  amount_within_per_incident_limit: boolean
  per_incident_limit: number | null
  aggregate_limit: number | null
  agent_sublimit: number | null
  deductible: number | null
  incident_within_policy_period: boolean
  policy_effective_at: string | null
  policy_expires_at: string | null
  coverage_eligible: boolean
  denial_reasons: string[]
}

export type PolicyTerms = {
  covered_events: string[]
  exclusions: string[]
  conditions: string[]
  per_incident_limit: number
  aggregate_limit: number
  deductible: number
}

const TriageResultSchema = z.object({
  triage_recommendation: z.enum(['likely_covered', 'needs_review', 'likely_not_covered', 'insufficient_information']),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string(),
  applicable_covered_events: z.array(z.string()),
  triggered_exclusions: z.array(z.string()),
  breached_conditions: z.array(z.string()),
  recommended_payout: z.number().nullable(),
  recommended_payout_basis: z.string(),
  flags: z.array(z.string()),
  next_steps: z.string(),
  requires_human_review: z.literal(true),
  damage_window_hours: z.number(),
  frequency_multiplier: z.number(),
  token_exposure_usd: z.number(),
  detection_lag_assessment: z.enum(['reasonable', 'concerning', 'excessive']),
  cascade_risk: z.boolean(),
})

export type TriageResult = z.infer<typeof TriageResultSchema>

export async function triageClaim(input: {
  description: string
  financial_impact_description?: string | null
  amount_claimed: number
  incident_date?: string | null
  agent_type?: string | null
  agent_description?: string | null
  coverage_limit: number
  per_incident_limit: number
  // Usage-based fields
  error_started_at?: string | null
  error_detected_at?: string | null
  actions_during_incident?: number | null
  tokens_consumed_during_incident?: number | null
  model_at_time_of_incident?: string | null
  agent_avg_tokens_per_action?: number | null
  agent_max_actions_per_day?: number | null
  agent_uses_tool_calls?: boolean | null
  agent_detection_lag_minutes?: number | null
  // Policy terms and coverage check
  coverageCheck?: CoverageCheckResult | null
  policyTerms?: PolicyTerms | null
  agentSublimit?: number | null
}): Promise<{ result: TriageResult | null; error: string | null; raw: string | null }> {
  try {
    const client = getClient()

    // Compute damage window
    let damageWindowHours = 0
    if (input.error_started_at && input.error_detected_at) {
      const start = new Date(input.error_started_at).getTime()
      const detected = new Date(input.error_detected_at).getTime()
      damageWindowHours = Math.max(0, (detected - start) / (1000 * 60 * 60))
    }

    const cc = input.coverageCheck
    const pt = input.policyTerms

    const coverageCheckSection = cc ? `
Coverage Check Result:
- Has active policy: ${cc.has_active_policy ? 'yes' : 'no'}
- Agent is covered: ${cc.agent_is_covered ? 'yes' : 'no'}
- Amount within per-incident limit: ${cc.amount_within_per_incident_limit ? 'yes' : 'no'} (limit: $${cc.per_incident_limit?.toLocaleString() ?? 'N/A'})
- Agent sublimit: $${(input.agentSublimit ?? cc.agent_sublimit)?.toLocaleString() ?? 'N/A'}
- Deductible: $${cc.deductible?.toLocaleString() ?? 'N/A'}
- Incident within policy period: ${cc.incident_within_policy_period ? 'yes' : 'no'}
${cc.denial_reasons.length > 0 ? `- Coverage issues: ${cc.denial_reasons.join('; ')}` : '- No coverage issues detected'}
` : ''

    const policyTermsSection = pt ? `
Policy Terms:

Covered Events:
${pt.covered_events.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Exclusions:
${pt.exclusions.length > 0 ? pt.exclusions.map((e, i) => `${i + 1}. ${e}`).join('\n') : 'None specified'}

Conditions:
${pt.conditions.map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''

    const claimData = {
      claim_description: input.description,
      financial_impact: input.financial_impact_description || 'Not provided',
      amount_claimed: input.amount_claimed,
      incident_date: input.incident_date || 'Not provided',
      agent_type: input.agent_type || 'Unknown',
      agent_description: input.agent_description || 'Not provided',
      policy_coverage_limit: input.coverage_limit,
      policy_per_incident_limit: input.per_incident_limit,
      error_started_at: input.error_started_at || 'Not provided',
      error_detected_at: input.error_detected_at || 'Not provided',
      damage_window_hours: damageWindowHours,
      actions_during_incident: input.actions_during_incident ?? 'Unknown',
      tokens_consumed_during_incident: input.tokens_consumed_during_incident ?? 'Unknown',
      model_at_time_of_incident: input.model_at_time_of_incident || 'Unknown',
      agent_avg_tokens_per_action: input.agent_avg_tokens_per_action ?? 'Unknown',
      agent_max_actions_per_day: input.agent_max_actions_per_day ?? 'Unknown',
      agent_uses_tool_calls: input.agent_uses_tool_calls ?? false,
      agent_detection_lag_minutes: input.agent_detection_lag_minutes ?? 'Unknown',
    }

    const userContent = `Please triage this claim and return a JSON object.

Claim Data:
${JSON.stringify(claimData, null, 2)}
${policyTermsSection}
${coverageCheckSection}

Return only valid JSON with these exact fields:
- triage_recommendation (one of: likely_covered, needs_review, likely_not_covered, insufficient_information)
- confidence (integer 0-100)
- reasoning (string — must reference specific policy language from the covered events, exclusions, and conditions above)
- applicable_covered_events (array of strings — quote the specific covered event text that may apply)
- triggered_exclusions (array of strings — quote the specific exclusion text that may apply)
- breached_conditions (array of strings — any conditions that appear to have been breached)
- recommended_payout (number or null)
- recommended_payout_basis (string — explain how this number was derived, referencing sublimit, deductible, and per-incident limit)
- flags (array of strings)
- next_steps (string)
- requires_human_review (must always be true)
- damage_window_hours (number, hours between error start and detection, 0 if unknown)
- frequency_multiplier (number, ratio of actions_during_incident to expected daily actions, 1.0 if unknown)
- token_exposure_usd (number, estimated token cost during incident)
- detection_lag_assessment (one of: reasonable, concerning, excessive)
- cascade_risk (boolean, true if tool call chaining likely amplified damage)`

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are Canopy's claims triage assistant. You review claims made against AI agent liability policies and produce a non-binding internal triage recommendation for human claims examiners.

You have access to the actual policy terms, coverage limits, and underwriting basis for the agent involved. Your role is to:
1. Assess whether the described incident appears to fall within the covered events as written
2. Flag any applicable exclusions that may limit or void coverage
3. Assess the reasonableness of the claimed amount against the policy limits
4. Identify any conditions that may have been breached (e.g. late notice, parameter deviation)
5. Recommend a payout range if coverage appears applicable

You are fair, precise, and cautious. You do not make final coverage determinations — that is the role of the human claims examiner. Output valid JSON only. Do not make a final claims determination. requires_human_review must always be true.

When assessing AI agent claims, consider:
- damage_window_hours: Time between error start and detection. Longer windows mean more accumulated damage.
- frequency_multiplier: actions_during_incident divided by expected daily actions. >1 means above-normal activity.
- token_exposure_usd: Estimate based on tokens_consumed × approximate cost per token for the model used (~$0.000003/token for GPT-4o, ~$0.000003/token for Claude Sonnet).
- detection_lag_assessment: "reasonable" (<60min), "concerning" (60-240min), "excessive" (>240min).
- cascade_risk: true if agent uses tool calls and actions_during_incident is high relative to expected.`,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { result: null, error: 'No JSON found in response', raw: rawText }
    }

    const parsed = JSON.parse(jsonMatch[0])
    // Force requires_human_review to true
    parsed.requires_human_review = true
    // Ensure numeric defaults
    if (typeof parsed.damage_window_hours !== 'number') parsed.damage_window_hours = damageWindowHours
    if (typeof parsed.frequency_multiplier !== 'number') parsed.frequency_multiplier = 1.0
    if (typeof parsed.token_exposure_usd !== 'number') parsed.token_exposure_usd = 0
    // Ensure array defaults for new fields
    if (!Array.isArray(parsed.applicable_covered_events)) parsed.applicable_covered_events = []
    if (!Array.isArray(parsed.triggered_exclusions)) parsed.triggered_exclusions = []
    if (!Array.isArray(parsed.breached_conditions)) parsed.breached_conditions = []
    if (typeof parsed.recommended_payout_basis !== 'string') parsed.recommended_payout_basis = ''

    const validated = TriageResultSchema.safeParse(parsed)
    if (!validated.success) {
      return { result: null, error: 'Invalid response structure', raw: rawText }
    }

    return { result: validated.data, error: null, raw: rawText }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { result: null, error: message, raw: null }
  }
}

export async function checkCoverage(input: {
  org_id: string
  agent_id?: string | null
  amount_claimed: number
  incident_date?: string | null
  error_started_at?: string | null
  policyDocument: {
    id: string
    policy_number: string
    status: string
    aggregate_limit: number
    per_incident_limit: number
    effective_at?: string | null
    expires_at?: string | null
    document: {
      covered_agents?: Array<{
        agent_id: string
        sublimit: number
        deductible: number
      }>
    }
  } | null
  agentUnderwritingStatus?: string | null
  existing_approved_claims_total: number
}): Promise<CoverageCheckResult> {
  const denial_reasons: string[] = []

  // 1. Active policy check
  const has_active_policy = input.policyDocument?.status === 'active'
  const policy_id = input.policyDocument?.id ?? null
  const policy_number = input.policyDocument?.policy_number ?? null

  if (!has_active_policy) denial_reasons.push('No active policy found')

  const per_incident_limit = input.policyDocument?.per_incident_limit ?? null
  const aggregate_limit = input.policyDocument?.aggregate_limit ?? null

  // 2. Agent covered check
  let agent_is_covered = false
  let agent_sublimit: number | null = null
  let deductible: number | null = null

  if (has_active_policy && input.agent_id) {
    const coveredAgents = input.policyDocument?.document?.covered_agents ?? []
    const agentEntry = coveredAgents.find((a) => a.agent_id === input.agent_id)
    agent_is_covered = !!agentEntry
    if (agentEntry) {
      agent_sublimit = agentEntry.sublimit
      deductible = agentEntry.deductible
    }
    if (!agent_is_covered) {
      denial_reasons.push('The specified agent is not listed as a covered agent in the active policy')
    }
  } else if (has_active_policy && !input.agent_id) {
    // No agent specified — treat as covered (org-level claim)
    agent_is_covered = true
  }

  // 3. Agent underwriting status check
  const agent_underwriting_status = input.agentUnderwritingStatus ?? null
  if (has_active_policy && input.agent_id && agent_is_covered && agent_underwriting_status && agent_underwriting_status !== 'approved') {
    denial_reasons.push(`Agent underwriting status is '${agent_underwriting_status}' — must be 'approved' for coverage`)
  }

  // 4. Per-incident limit check
  const amount_within_per_incident_limit = has_active_policy && per_incident_limit !== null
    ? input.amount_claimed <= per_incident_limit
    : false
  if (has_active_policy && per_incident_limit !== null && !amount_within_per_incident_limit) {
    denial_reasons.push(`Amount claimed ($${input.amount_claimed.toLocaleString()}) exceeds per-incident limit ($${per_incident_limit.toLocaleString()})`)
  }

  // 5. Incident within policy period check
  const policy_effective_at = input.policyDocument?.effective_at ?? null
  const policy_expires_at = input.policyDocument?.expires_at ?? null
  let incident_within_policy_period = false

  if (has_active_policy) {
    const incidentDate = input.incident_date || input.error_started_at
    if (incidentDate && policy_effective_at) {
      const incident = new Date(incidentDate)
      const effective = new Date(policy_effective_at)
      const expires = policy_expires_at ? new Date(policy_expires_at) : null
      incident_within_policy_period = incident >= effective && (!expires || incident <= expires)
      if (!incident_within_policy_period) {
        denial_reasons.push('Incident date falls outside the policy period')
      }
    } else {
      // No incident date to check — default to within period
      incident_within_policy_period = true
    }
  }

  const coverage_eligible =
    has_active_policy &&
    agent_is_covered &&
    (!input.agent_id || !agent_underwriting_status || agent_underwriting_status === 'approved') &&
    amount_within_per_incident_limit &&
    incident_within_policy_period &&
    denial_reasons.length === 0

  return {
    has_active_policy,
    policy_id,
    policy_number,
    agent_is_covered,
    agent_underwriting_status,
    amount_within_per_incident_limit,
    per_incident_limit,
    aggregate_limit,
    agent_sublimit,
    deductible,
    incident_within_policy_period,
    policy_effective_at,
    policy_expires_at,
    coverage_eligible,
    denial_reasons,
  }
}
