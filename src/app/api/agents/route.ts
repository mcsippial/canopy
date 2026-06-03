import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'
import { scoreAgentRisk } from '@/lib/ai'

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['customer_service', 'financial', 'workflow', 'knowledge', 'other']),
  description: z.string().max(2000).optional(),
  actions_description: z.string().max(2000).optional(),
  connected_systems: z.string().max(1000).optional(),
  // New fields
  model_name: z.string().max(100).optional(),
  model_provider: z.enum(['openai', 'anthropic', 'google', 'mistral', 'other']).optional(),
  avg_tokens_per_action: z.number().int().positive().optional(),
  pricing_model: z.enum(['per_token', 'per_call', 'per_minute', 'flat_rate', 'unknown']).optional(),
  max_actions_per_day: z.number().int().positive().optional(),
  deployment_type: z.enum(['realtime', 'batch', 'scheduled', 'event_driven']).optional(),
  uses_tool_calls: z.boolean().optional(),
  max_tool_call_depth: z.number().int().min(0).optional(),
  human_in_loop: z.boolean().optional(),
  detection_lag_minutes: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin', 'member'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateAgentSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createClient()

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      org_id: membership.org_id,
      ...parsed.data,
      status: 'review',
      daily_actions: 0,
    })
    .select()
    .single()

  if (error || !agent) return serverErrorResponse('Failed to create agent')

  const { result: riskResult } = await scoreAgentRisk(parsed.data).catch(() => ({ result: null }))

  if (riskResult) {
    await supabase
      .from('agents')
      .update({
        risk_score: riskResult.risk_score,
        risk_level: riskResult.risk_level,
        risk_assessment: riskResult as unknown as Record<string, unknown>,
      })
      .eq('id', agent.id)

    agent.risk_score = riskResult.risk_score
    agent.risk_level = riskResult.risk_level
    agent.risk_assessment = riskResult as unknown as Record<string, unknown>
  }

  return NextResponse.json(agent, { status: 201 })
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false })

  if (error) return serverErrorResponse()

  return NextResponse.json(data)
}
