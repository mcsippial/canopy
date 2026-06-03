export type UnderwritingDecision = {
  eligible: boolean
  decision: 'approved' | 'declined' | 'referred'
  reason: string
  recommended_plan: 'starter' | 'growth' | 'enterprise' | null
  per_agent_sublimit: number
  per_incident_limit: number
  deductible: number
  exclusions: string[]
  conditions: string[]
  underwriting_basis: {
    risk_score: number
    risk_level: string
    deployment_type: string
    human_in_loop: boolean
    detection_lag_minutes: number
    uses_tool_calls: boolean
    max_tool_call_depth: number
    model_provider: string
    avg_tokens_per_action: number
    max_actions_per_day: number
  }
}

type AgentInput = {
  risk_score?: number | null
  risk_level?: string | null
  deployment_type?: string | null
  human_in_loop?: boolean | null
  detection_lag_minutes?: number | null
  uses_tool_calls?: boolean | null
  max_tool_call_depth?: number | null
  model_provider?: string | null
  avg_tokens_per_action?: number | null
  max_actions_per_day?: number | null
}

const STANDARD_EXCLUSIONS = [
  'Intentional or fraudulent acts by the insured organization',
  'Losses caused by failure to maintain the agent within its registered operational parameters',
  'Losses occurring prior to policy effective date',
  'Losses caused by actions of agents not registered under this policy',
  'Consequential or punitive damages beyond direct financial loss',
]

export function runUnderwriting(agent: AgentInput): UnderwritingDecision {
  const riskScore = agent.risk_score ?? null
  const riskLevel = agent.risk_level ?? 'unknown'
  const deploymentType = agent.deployment_type ?? 'realtime'
  const humanInLoop = agent.human_in_loop ?? false
  const detectionLag = agent.detection_lag_minutes ?? 60
  const usesToolCalls = agent.uses_tool_calls ?? false
  const maxToolCallDepth = agent.max_tool_call_depth ?? 0
  const modelProvider = agent.model_provider ?? 'other'
  const avgTokens = agent.avg_tokens_per_action ?? 0
  const maxActionsPerDay = agent.max_actions_per_day ?? 0

  const basis = {
    risk_score: riskScore as number,
    risk_level: riskLevel,
    deployment_type: deploymentType,
    human_in_loop: humanInLoop,
    detection_lag_minutes: detectionLag,
    uses_tool_calls: usesToolCalls,
    max_tool_call_depth: maxToolCallDepth,
    model_provider: modelProvider,
    avg_tokens_per_action: avgTokens,
    max_actions_per_day: maxActionsPerDay,
  }

  // Build exclusions
  const exclusions = [...STANDARD_EXCLUSIONS]
  if (!humanInLoop) {
    exclusions.push('Losses from extended autonomous operation without human review exceeding 48 hours')
  }
  if (deploymentType === 'batch') {
    exclusions.push('Losses from batch jobs initiated without pre-execution validation')
  }
  if (usesToolCalls) {
    exclusions.push(`Losses from tool call chains exceeding the registered maximum depth of ${maxToolCallDepth}`)
  }

  // Automatic declines
  if (riskScore === null) {
    return {
      eligible: false,
      decision: 'declined',
      reason: 'Agent has not been risk scored. Agents must be scored before underwriting.',
      recommended_plan: null,
      per_agent_sublimit: 0,
      per_incident_limit: 0,
      deductible: 0,
      exclusions,
      conditions: [],
      underwriting_basis: { ...basis, risk_score: 0 },
    }
  }

  if (riskScore > 85) {
    return decline('Risk score exceeds maximum threshold of 85', exclusions, basis)
  }
  if (deploymentType === 'batch' && !humanInLoop && detectionLag > 480) {
    return decline('Batch deployment without human oversight and detection lag exceeding 480 minutes is not insurable', exclusions, basis)
  }
  if (usesToolCalls && maxToolCallDepth > 10 && !humanInLoop) {
    return decline('Tool call depth exceeding 10 without human oversight is not insurable', exclusions, basis)
  }
  if (maxActionsPerDay > 1_000_000) {
    return decline('Agents performing more than 1,000,000 actions per day are not eligible for coverage', exclusions, basis)
  }

  // Referral conditions
  const referralReasons: string[] = []
  if (riskScore >= 70) referralReasons.push('risk score >= 70')
  if (deploymentType === 'batch' && !humanInLoop) referralReasons.push('batch deployment without human oversight')
  if (usesToolCalls && maxToolCallDepth > 5) referralReasons.push('tool call depth exceeds 5')
  if (detectionLag > 240) referralReasons.push('detection lag exceeds 240 minutes')
  if (modelProvider === 'other') referralReasons.push('unknown model provider')
  if (avgTokens > 50000) referralReasons.push('average tokens per action exceeds 50,000')

  if (referralReasons.length > 0) {
    const sublimit = calcSublimit(riskScore, humanInLoop, deploymentType, usesToolCalls, maxToolCallDepth, detectionLag, null)
    const deductible = calcDeductible(riskScore, deploymentType, humanInLoop)
    const conditions = buildConditions(basis)
    return {
      eligible: false,
      decision: 'referred',
      reason: `Referred to manual underwriting: ${referralReasons.join('; ')}`,
      recommended_plan: null,
      per_agent_sublimit: sublimit,
      per_incident_limit: 250_000,
      deductible,
      exclusions,
      conditions,
      underwriting_basis: basis,
    }
  }

  // Approved — determine plan
  let recommended_plan: 'starter' | 'growth' | 'enterprise'
  if (riskScore <= 30) {
    recommended_plan = 'starter'
  } else if (riskScore <= 55) {
    recommended_plan = 'growth'
  } else {
    recommended_plan = 'enterprise'
  }

  const sublimit = calcSublimit(riskScore, humanInLoop, deploymentType, usesToolCalls, maxToolCallDepth, detectionLag, recommended_plan)
  const perIncidentLimit = recommended_plan === 'starter' ? 50_000 : recommended_plan === 'growth' ? 250_000 : 1_000_000
  const deductible = calcDeductible(riskScore, deploymentType, humanInLoop)
  const conditions = buildConditions(basis)

  return {
    eligible: true,
    decision: 'approved',
    reason: `Agent approved for ${recommended_plan} plan coverage`,
    recommended_plan,
    per_agent_sublimit: sublimit,
    per_incident_limit: perIncidentLimit,
    deductible,
    exclusions,
    conditions,
    underwriting_basis: basis,
  }
}

function decline(reason: string, exclusions: string[], basis: UnderwritingDecision['underwriting_basis']): UnderwritingDecision {
  return {
    eligible: false,
    decision: 'declined',
    reason,
    recommended_plan: null,
    per_agent_sublimit: 0,
    per_incident_limit: 0,
    deductible: 0,
    exclusions,
    conditions: [],
    underwriting_basis: basis,
  }
}

function calcSublimit(
  riskScore: number,
  humanInLoop: boolean,
  deploymentType: string,
  usesToolCalls: boolean,
  maxToolCallDepth: number,
  detectionLag: number,
  plan: 'starter' | 'growth' | 'enterprise' | null,
): number {
  let sublimit = 100_000
  if (riskScore > 60) sublimit *= 0.5
  if (humanInLoop) sublimit *= 1.5
  if (deploymentType === 'batch') sublimit *= 0.7
  if (usesToolCalls && maxToolCallDepth > 3) sublimit *= 0.8
  if (detectionLag < 30) sublimit *= 1.2

  if (plan === 'starter' && sublimit > 500_000) sublimit = 500_000
  if (plan === 'growth' && sublimit > 1_000_000) sublimit = 1_000_000

  return Math.round(sublimit)
}

function calcDeductible(riskScore: number, deploymentType: string, humanInLoop: boolean): number {
  let deductible = 1_000
  if (riskScore > 70) {
    deductible *= 4
  } else if (riskScore > 50) {
    deductible *= 2
  }
  if (deploymentType === 'batch' && !humanInLoop) deductible += 2_500
  if (!humanInLoop) deductible += 1_000
  return deductible
}

function buildConditions(basis: UnderwritingDecision['underwriting_basis']): string[] {
  const conditions: string[] = []
  if (!basis.human_in_loop) {
    conditions.push('Automated monitoring system must be in place and operational at all times')
  }
  if (basis.uses_tool_calls) {
    conditions.push(`Tool call chains must not exceed depth of ${basis.max_tool_call_depth} as registered`)
  }
  if (basis.deployment_type === 'batch') {
    conditions.push('Pre-execution validation checks must be performed before each batch job')
  }
  return conditions
}
