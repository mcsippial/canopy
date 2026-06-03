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
})

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>

export async function scoreAgentRisk(agent: {
  name: string
  type: string
  description?: string | null
  actions_description?: string | null
  connected_systems?: string | null
}): Promise<{ result: RiskAssessment | null; error: string | null; raw: string | null }> {
  try {
    const client = getClient()

    const userMessage = JSON.stringify({
      agent_name: agent.name,
      agent_type: agent.type,
      description: agent.description || 'Not provided',
      actions_description: agent.actions_description || 'Not provided',
      connected_systems: agent.connected_systems || 'Not provided',
    })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are Canopy's risk assessment assistant. You evaluate AI agents based on their type, description, actions, and connected systems to assign an internal liability risk score from 0-100. Higher scores mean higher potential liability risk. Output valid JSON only. Your output is an internal recommendation, not an underwriting decision.`,
      messages: [
        {
          role: 'user',
          content: `Please assess the risk for this AI agent and return a JSON object:\n\n${userMessage}\n\nReturn only valid JSON with these fields: risk_score (integer 0-100), risk_level (low/medium/high), risk_factors (array of strings), recommendations (array of strings), reasoning (string).`,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
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
}): Promise<{ result: TriageResult | null; error: string | null; raw: string | null }> {
  try {
    const client = getClient()

    const userMessage = JSON.stringify({
      claim_description: input.description,
      financial_impact: input.financial_impact_description || 'Not provided',
      amount_claimed: input.amount_claimed,
      incident_date: input.incident_date || 'Not provided',
      agent_type: input.agent_type || 'Unknown',
      agent_description: input.agent_description || 'Not provided',
      policy_coverage_limit: input.coverage_limit,
      policy_per_incident_limit: input.per_incident_limit,
    })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are Canopy's claims triage assistant. You review claims made against AI agent deployments and produce a non-binding internal triage recommendation. You are fair, precise, and cautious. Follow the provided policy terms and flag uncertainty. Output valid JSON only. Do not make a final claims determination.`,
      messages: [
        {
          role: 'user',
          content: `Please triage this claim and return a JSON object:\n\n${userMessage}\n\nReturn only valid JSON with these fields: triage_recommendation (one of: likely_covered, needs_review, likely_not_covered, insufficient_information), confidence (integer 0-100), reasoning (string), recommended_payout (number or null), flags (array of strings), next_steps (string), requires_human_review (must be true).`,
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
