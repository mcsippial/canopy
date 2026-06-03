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

const TriageResultSchema = z.object({
  triage_recommendation: z.enum(['likely_covered', 'needs_review', 'likely_not_covered', 'insufficient_information']),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string(),
  recommended_payout: z.number().nullable(),
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
  // New usage-based fields
  error_started_at?: string | null
  error_detected_at?: string | null
  actions_during_incident?: number | null
  tokens_consumed_during_incident?: number | null
  model_at_time_of_incident?: string | null
  agent_avg_tokens_per_action?: number | null
  agent_max_actions_per_day?: number | null
  agent_uses_tool_calls?: boolean | null
  agent_detection_lag_minutes?: number | null
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

    const userMessage = JSON.stringify({
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
    })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are Canopy's claims triage assistant. You review claims made against AI agent deployments and produce a non-binding internal triage recommendation. You are fair, precise, and cautious. Follow the provided policy terms and flag uncertainty. Output valid JSON only. Do not make a final claims determination.

When assessing AI agent claims, consider:
- damage_window_hours: Time between error start and detection. Longer windows mean more accumulated damage.
- frequency_multiplier: actions_during_incident divided by expected daily actions. >1 means above-normal activity.
- token_exposure_usd: Estimate based on tokens_consumed × approximate cost per token for the model used (~$0.000003/token for GPT-4o, ~$0.000003/token for Claude Sonnet).
- detection_lag_assessment: "reasonable" (<60min), "concerning" (60-240min), "excessive" (>240min).
- cascade_risk: true if agent uses tool calls and actions_during_incident is high relative to expected.`,
      messages: [
        {
          role: 'user',
          content: `Please triage this claim and return a JSON object:\n\n${userMessage}\n\nReturn only valid JSON with these exact fields:
- triage_recommendation (one of: likely_covered, needs_review, likely_not_covered, insufficient_information)
- confidence (integer 0-100)
- reasoning (string)
- recommended_payout (number or null)
- flags (array of strings)
- next_steps (string)
- requires_human_review (must always be true)
- damage_window_hours (number, hours between error start and detection, 0 if unknown)
- frequency_multiplier (number, ratio of actions_during_incident to expected daily actions, 1.0 if unknown)
- token_exposure_usd (number, estimated token cost during incident)
- detection_lag_assessment (one of: reasonable, concerning, excessive)
- cascade_risk (boolean, true if tool call chaining likely amplified damage)`,
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

// Coverage check result type
export interface CoverageCheckResult {
  passed: boolean
  reasons: string[]
  active_policy: boolean
  within_per_incident_limit: boolean
  aggregate_not_exhausted: boolean
  within_effective_period: boolean
  agent_registered_before_incident: boolean
  per_incident_limit: number
  coverage_limit: number
}

export async function checkCoverage(input: {
  org_id: string
  agent_id?: string | null
  amount_claimed: number
  incident_date?: string | null
  error_started_at?: string | null
  policy: {
    id: string
    status: string
    coverage_limit: number
    per_incident_limit: number
    effective_at?: string | null
    renews_at?: string | null
  } | null
  agent_created_at?: string | null
  existing_approved_claims_total: number
}): Promise<CoverageCheckResult> {
  const reasons: string[] = []

  // 1. Active policy check
  const active_policy = input.policy?.status === 'active'
  if (!active_policy) reasons.push('No active policy found')

  const per_incident_limit = input.policy?.per_incident_limit ?? 0
  const coverage_limit = input.policy?.coverage_limit ?? 0

  // 2. Per-incident limit check
  const within_per_incident_limit = active_policy ? input.amount_claimed <= per_incident_limit : false
  if (active_policy && !within_per_incident_limit) {
    reasons.push(`Amount claimed ($${input.amount_claimed.toLocaleString()}) exceeds per-incident limit ($${per_incident_limit.toLocaleString()})`)
  }

  // 3. Aggregate limit check
  const remaining_aggregate = coverage_limit - input.existing_approved_claims_total
  const aggregate_not_exhausted = active_policy ? remaining_aggregate >= input.amount_claimed : false
  if (active_policy && !aggregate_not_exhausted) {
    reasons.push(`Aggregate coverage limit may be exhausted (remaining: $${remaining_aggregate.toLocaleString()})`)
  }

  // 4. Effective period check
  let within_effective_period = false
  if (active_policy && input.policy?.effective_at) {
    const incidentDate = input.incident_date || input.error_started_at
    if (incidentDate) {
      const incident = new Date(incidentDate)
      const effective = new Date(input.policy.effective_at)
      const renews = input.policy.renews_at ? new Date(input.policy.renews_at) : null
      within_effective_period = incident >= effective && (!renews || incident <= renews)
      if (!within_effective_period) reasons.push('Incident date is outside policy effective period')
    } else {
      within_effective_period = true // No date to check against
    }
  } else {
    within_effective_period = active_policy
  }

  // 5. Agent registration check
  let agent_registered_before_incident = true
  if (input.agent_created_at && (input.incident_date || input.error_started_at)) {
    const incidentDate = new Date(input.incident_date || input.error_started_at!)
    const agentDate = new Date(input.agent_created_at)
    agent_registered_before_incident = agentDate <= incidentDate
    if (!agent_registered_before_incident) {
      reasons.push('Agent was registered after the incident date')
    }
  }

  const passed =
    active_policy &&
    within_per_incident_limit &&
    aggregate_not_exhausted &&
    within_effective_period &&
    agent_registered_before_incident

  return {
    passed,
    reasons,
    active_policy,
    within_per_incident_limit,
    aggregate_not_exhausted,
    within_effective_period,
    agent_registered_before_incident,
    per_incident_limit,
    coverage_limit,
  }
}
