import type { UnderwritingDecision } from './underwriting'

export type PolicyDocument = {
  policy_number: string
  issued_at: string
  effective_at: string
  expires_at: string
  insured_organization: {
    name: string
    id: string
  }
  covered_agents: Array<{
    agent_id: string
    agent_name: string
    agent_type: string
    model_name: string
    sublimit: number
    deductible: number
    underwriting_decision: UnderwritingDecision
    risk_score_at_issuance: number
    score_locked_at: string
  }>
  aggregate_limit: number
  per_incident_limit: number
  premium_monthly: number
  coverage_territory: string
  covered_events: string[]
  exclusions: string[]
  conditions: string[]
  claims_process: string[]
  governing_law: string
}

const STANDARD_COVERED_EVENTS = [
  'Direct financial losses to end users caused by AI agent errors or hallucinations',
  'Losses from unintended agent actions within registered operational parameters',
  'Losses from unauthorized data access caused by agent malfunction',
  'Costs of reasonable remediation efforts following a covered incident',
  'Legal defense costs for covered third-party claims (up to 10% of per-incident limit)',
]

const STANDARD_CONDITIONS = [
  'The insured must notify Canopy within 72 hours of discovering a potential covered incident',
  'The insured must maintain agent operation logs for a minimum of 90 days',
  'Coverage is contingent on agents operating within their registered parameters',
  'The insured must cooperate fully with claims investigation',
  'Policy is subject to annual renewal and re-underwriting',
]

const STANDARD_CLAIMS_PROCESS = [
  'Submit a claim through the Canopy portal within 72 hours of incident discovery',
  'Provide incident description, affected agent ID, and estimated financial impact',
  'Canopy will acknowledge receipt and assign a claims examiner within 2 business days',
  'Cooperate with investigation, including providing access to agent logs and related records',
  'Canopy will issue a coverage determination within 30 days of receiving complete documentation',
  'Approved claims will be paid within 15 business days of determination',
]

function generatePolicyNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `CNP-${year}-${random}`
}

type ApprovedAgentInput = {
  agent_id: string
  agent_name: string
  agent_type: string
  model_name: string
  underwriting_decision: UnderwritingDecision
  risk_score_at_issuance: number
  score_locked_at: string
}

type GeneratePolicyInput = {
  org_id: string
  org_name: string
  approved_agents: ApprovedAgentInput[]
  plan: 'starter' | 'growth' | 'enterprise'
}

export function generatePolicy(input: GeneratePolicyInput): PolicyDocument {
  const now = new Date()
  const effectiveAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  // Aggregate limit = sum of per-agent sublimits, capped by plan
  const planAggregateLimits = {
    starter: 500_000,
    growth: 2_000_000,
    enterprise: 5_000_000,
  }
  const planPerIncidentLimits = {
    starter: 50_000,
    growth: 250_000,
    enterprise: 1_000_000,
  }
  const planPremiums = {
    starter: 299,
    growth: 899,
    enterprise: 0,
  }

  const aggregate_limit = planAggregateLimits[input.plan]
  const per_incident_limit = planPerIncidentLimits[input.plan]
  const premium_monthly = planPremiums[input.plan]

  // Collect all exclusions from all agents (deduplicated)
  const allExclusions = new Set<string>()
  const allConditions = new Set<string>(STANDARD_CONDITIONS)

  const covered_agents = input.approved_agents.map((a) => {
    a.underwriting_decision.exclusions.forEach((ex) => allExclusions.add(ex))
    a.underwriting_decision.conditions.forEach((c) => allConditions.add(c))
    return {
      agent_id: a.agent_id,
      agent_name: a.agent_name,
      agent_type: a.agent_type,
      model_name: a.model_name,
      sublimit: a.underwriting_decision.per_agent_sublimit,
      deductible: a.underwriting_decision.deductible,
      underwriting_decision: a.underwriting_decision,
      risk_score_at_issuance: a.risk_score_at_issuance,
      score_locked_at: a.score_locked_at,
    }
  })

  return {
    policy_number: generatePolicyNumber(),
    issued_at: now.toISOString(),
    effective_at: effectiveAt,
    expires_at: expiresAt,
    insured_organization: {
      name: input.org_name,
      id: input.org_id,
    },
    covered_agents,
    aggregate_limit,
    per_incident_limit,
    premium_monthly,
    coverage_territory: 'United States and Canada',
    covered_events: STANDARD_COVERED_EVENTS,
    exclusions: Array.from(allExclusions),
    conditions: Array.from(allConditions),
    claims_process: STANDARD_CLAIMS_PROCESS,
    governing_law: 'State of Delaware, United States',
  }
}
