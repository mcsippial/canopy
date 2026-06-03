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
  'Direct pecuniary loss sustained by a covered end user directly resulting from an erroneous output, hallucination, or material omission produced by a registered AI agent acting within its authorized operational scope',
  'Financial loss arising from an unintended autonomous action taken by a registered AI agent that falls outside its configured behavioral parameters, provided such action was not the result of operator misconfiguration',
  'Reasonable and necessary costs incurred by the insured organization to investigate, remediate, and notify affected end users following a covered AI agent incident, up to 15% of the applicable per-incident limit',
  'Third-party claims expenses, including reasonable legal defense costs, arising from a covered incident, subject to a sublimit of 10% of the applicable per-incident limit',
  'Loss of covered end-user funds directly attributable to unauthorized data exfiltration or unauthorized financial transaction initiated by a registered AI agent due to a security malfunction',
]

const STANDARD_CONDITIONS = [
  'The Insured shall provide written notice to Canopy of any occurrence that may give rise to a claim hereunder within seventy-two (72) hours of first discovery. Notice shall be provided through the Canopy claims portal at canopy.insure and shall include the incident date, affected agent identifier, and a preliminary description of the loss.',
  'The Insured shall maintain complete and accurate operational logs for all registered AI agents for a minimum period of ninety (90) days. Such logs shall include, at minimum, input records, output records, action timestamps, token consumption records, and any error or exception events.',
  'Coverage under this policy is strictly contingent upon each registered AI agent operating within the behavioral parameters, model specifications, token limits, and action frequency limits disclosed to and approved by Canopy at the time of underwriting. Material deviation from registered parameters may void coverage for incidents arising during such deviation.',
  'The Insured shall cooperate fully and in good faith with Canopy\'s claims investigation, including providing prompt access to operational logs, system records, relevant personnel, and any third-party documentation reasonably requested by Canopy or its appointed claims examiner.',
  'This policy is subject to annual renewal. Coverage for each registered AI agent is contingent upon successful re-underwriting at renewal. Canopy reserves the right to modify terms, adjust sublimits, or decline renewal based on updated risk assessment, claims history, or material changes to agent operation.',
  'The Insured shall promptly notify Canopy of any material change to a registered AI agent\'s operational parameters, underlying model, connected systems, action frequency, or deployment architecture. Coverage may be suspended pending re-underwriting review for material changes.',
  'In the event of a covered loss, the Insured shall take all reasonable steps to mitigate further loss and prevent recurrence, including suspending the affected agent\'s operation if necessary. Failure to mitigate may reduce the covered loss amount proportionally.',
]

const STANDARD_CLAIMS_PROCESS = [
  'Submit a First Notice of Loss through the Canopy claims portal within seventy-two (72) hours of incident discovery, including the affected agent identifier, incident date and time, and a preliminary estimate of financial impact.',
  'Provide complete supporting documentation, including agent operational logs, affected end-user records, evidence of financial loss, and any communications related to the incident, within fourteen (14) calendar days of the First Notice of Loss.',
  'A licensed claims examiner will be assigned within two (2) business days of receipt of a complete First Notice of Loss. The examiner will conduct an independent review of the incident, policy terms, and submitted documentation.',
  'The Insured must provide full cooperation with the claims investigation, including access to systems, personnel, and records as reasonably required. Failure to cooperate may result in suspension of the claim.',
  'Canopy will issue a written coverage determination within thirty (30) calendar days of receipt of complete documentation. The determination will state the covered amount, any applicable deductible, and the basis for the decision.',
  'Approved claim payments will be issued within fifteen (15) business days of the written coverage determination, net of any applicable deductible. Payment will be made to the Insured organization unless otherwise directed in writing.',
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
    governing_law: 'This policy is governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to conflict of law principles. Any dispute arising under this policy shall be subject to binding arbitration under the rules of the American Arbitration Association.',
  }
}
