import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse } from '@/lib/auth'

export type AgentMonitoringStats = {
  agentId: string
  lastSeenAt: string | null
  actionsToday: number
  violationsCount: number
  monitoringStatus: 'green' | 'yellow' | 'red'
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  // Get all agents for this org
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, status')
    .eq('org_id', membership.org_id)

  if (agentsError || !agents) return serverErrorResponse()

  if (agents.length === 0) {
    return NextResponse.json([])
  }

  const agentIds = agents.map(a => a.id)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // Fetch recent audit log entries for all agents
  const { data: logs, error: logsError } = await supabase
    .from('audit_log')
    .select('agent_id, occurred_at, severity, action_type')
    .eq('org_id', membership.org_id)
    .in('agent_id', agentIds)
    .gte('occurred_at', startOfToday)
    .order('occurred_at', { ascending: false })

  if (logsError) return serverErrorResponse()

  // Also get last seen for each agent (most recent log entry overall)
  const { data: lastSeenLogs } = await supabase
    .from('audit_log')
    .select('agent_id, occurred_at')
    .eq('org_id', membership.org_id)
    .in('agent_id', agentIds)
    .order('occurred_at', { ascending: false })
    .limit(agentIds.length * 5)

  const stats: AgentMonitoringStats[] = agents.map(agent => {
    const agentLogs = (logs ?? []).filter(l => l.agent_id === agent.id)
    const actionsToday = agentLogs.filter(
      l => l.action_type === 'tool_call' || l.action_type === 'tool_response'
    ).length
    const violationsCount = agentLogs.filter(
      l => l.severity === 'warning' || l.severity === 'critical'
    ).length

    // Last seen: most recent log entry for this agent
    const lastSeenEntry = (lastSeenLogs ?? []).find(l => l.agent_id === agent.id)
    const lastSeenAt = lastSeenEntry?.occurred_at ?? null

    // Determine monitoring status dot color
    let monitoringStatus: 'green' | 'yellow' | 'red' = 'green'

    const hasBlockedActions = agentLogs.some(l => l.severity === 'critical')
    const agentSuspended = agent.status === 'suspended'

    if (hasBlockedActions || agentSuspended) {
      monitoringStatus = 'red'
    } else if (
      violationsCount > 0 ||
      (lastSeenAt && lastSeenAt < oneDayAgo) ||
      (!lastSeenAt)
    ) {
      monitoringStatus = 'yellow'
    } else if (lastSeenAt && lastSeenAt >= oneHourAgo) {
      monitoringStatus = 'green'
    } else {
      // Active, no violations, but not seen in last hour
      monitoringStatus = 'yellow'
    }

    return {
      agentId: agent.id,
      lastSeenAt,
      actionsToday,
      violationsCount,
      monitoringStatus,
    }
  })

  return NextResponse.json(stats)
}
