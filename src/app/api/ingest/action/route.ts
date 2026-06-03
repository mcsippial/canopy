import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const ActionLogSchema = z.object({
  actionType: z.enum(['tool_call', 'tool_response', 'policy_violation', 'anomaly']),
  toolName: z.string(),
  inputHash: z.string(),
  outputHash: z.string().optional(),
  tokensEstimated: z.number().optional(),
  callDepth: z.number(),
  durationMs: z.number().optional(),
  blocked: z.boolean(),
  violationReason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string(),
})

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('X-Canopy-Agent-Id')
  const apiKey = req.headers.get('X-Canopy-Api-Key')

  if (!agentId || !apiKey) {
    return NextResponse.json({ error: 'Missing authentication headers' }, { status: 401 })
  }

  // Use admin client since this is an API key authenticated endpoint (no user session)
  const supabase = createAdminClient()

  // Look up the badge_embed by api key (embed_key) and verify it belongs to an org with this agent
  const { data: badge, error: badgeError } = await supabase
    .from('badge_embeds')
    .select('org_id, active')
    .eq('embed_key', apiKey)
    .single()

  if (badgeError || !badge) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  if (!badge.active) {
    return NextResponse.json({ error: 'API key is inactive' }, { status: 403 })
  }

  // Verify the agent belongs to this org
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, org_id, status, max_actions_per_day')
    .eq('id', agentId)
    .eq('org_id', badge.org_id)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found or does not belong to this organization' }, { status: 404 })
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ActionLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action log', details: parsed.error.flatten() }, { status: 400 })
  }

  const log = parsed.data

  // Determine severity
  let severity: 'info' | 'warning' | 'critical' = 'info'
  if (log.actionType === 'policy_violation') {
    severity = log.blocked ? 'critical' : 'warning'
  } else if (log.actionType === 'anomaly') {
    const anomalySeverity = (log.metadata?.severity as string | undefined) ?? 'low'
    severity = anomalySeverity === 'high' ? 'critical' : 'warning'
  }

  // Insert into audit_log
  const { error: insertError } = await supabase.from('audit_log').insert({
    org_id: badge.org_id,
    agent_id: agentId,
    action_type: log.actionType,
    action_description: log.toolName
      ? `Tool: ${log.toolName}${log.violationReason ? ` — ${log.violationReason}` : ''}`
      : undefined,
    occurred_at: log.occurredAt,
    severity,
    input_hash: log.inputHash,
    output_hash: log.outputHash,
    metadata: {
      callDepth: log.callDepth,
      durationMs: log.durationMs,
      tokensEstimated: log.tokensEstimated,
      blocked: log.blocked,
      violationReason: log.violationReason,
      ...(log.metadata ?? {}),
    },
  })

  if (insertError) {
    console.error('[Canopy ingest] Failed to insert audit log:', insertError)
    // Still return 200 — don't break the agent
    return NextResponse.json({ ok: true })
  }

  // If policy violation, update agent status to 'review' if currently 'active'
  if (log.actionType === 'policy_violation' && agent.status === 'active') {
    await supabase
      .from('agents')
      .update({ status: 'review', updated_at: new Date().toISOString() })
      .eq('id', agentId)
  }

  return NextResponse.json({ ok: true })
}
