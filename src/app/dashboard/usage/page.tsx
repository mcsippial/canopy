import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Activity, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { PLAN_LIMITS } from '@/types'

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`
}

interface BarProps {
  value: number
  max: number
  color?: string
}

function Bar({ value, max, color = '#5DCAA5' }: BarProps) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

export default async function UsagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations
  const orgId = membership.org_id

  const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
  const planLimits = PLAN_LIMITS[planKey]

  // Fetch usage records per agent
  const { data: usageRecords } = await supabase
    .from('usage_records')
    .select('*, agents(name, type, model_name, max_actions_per_day, detection_lag_minutes, uses_tool_calls)')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false })
    .limit(100)

  // Fetch agents for overview
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, type, model_name, avg_tokens_per_action, max_actions_per_day, detection_lag_minutes, uses_tool_calls, human_in_loop, risk_score, status')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const tokensUsed = Number(org?.tokens_used_this_period ?? 0)
  const actionsUsed = Number(org?.actions_used_this_period ?? 0)
  const tokenLimit = org?.monthly_token_limit ? Number(org.monthly_token_limit) : planLimits.monthly_tokens
  const actionLimit = org?.monthly_action_limit ? Number(org.monthly_action_limit) : planLimits.monthly_actions

  const tokenPct = isFinite(tokenLimit) && tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0
  const actionPct = isFinite(actionLimit) && actionLimit > 0 ? (actionsUsed / actionLimit) * 100 : 0

  // Overage
  let overageCost = 0
  if (isFinite(tokenLimit) && tokensUsed > tokenLimit) {
    overageCost = ((tokensUsed - tokenLimit) / 1000) * planLimits.overage_per_1k_tokens
  }

  // Group usage by agent
  const agentUsageMap: Record<string, { tokens: number; actions: number; toolCalls: number; cost: number }> = {}
  for (const rec of usageRecords || []) {
    if (!agentUsageMap[rec.agent_id]) {
      agentUsageMap[rec.agent_id] = { tokens: 0, actions: 0, toolCalls: 0, cost: 0 }
    }
    agentUsageMap[rec.agent_id].tokens += Number(rec.total_tokens)
    agentUsageMap[rec.agent_id].actions += Number(rec.total_actions)
    agentUsageMap[rec.agent_id].toolCalls += Number(rec.total_tool_calls)
    agentUsageMap[rec.agent_id].cost += Number(rec.estimated_cost_usd ?? 0)
  }

  // Compute estimated liability exposure per agent
  const EST_COST_PER_1K_TOKENS = 0.003 // conservative blended estimate

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Usage</h1>
        <p className="text-gray-600 mt-1">Token consumption, action counts, and estimated liability exposure.</p>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Tokens this period</span>
            <Zap size={16} className="text-[#5DCAA5]" />
          </div>
          <div className="text-3xl font-bold text-[#1a1a2e] mb-1">{formatNumber(tokensUsed)}</div>
          <div className="text-xs text-gray-500 mb-3">of {isFinite(tokenLimit) ? formatNumber(tokenLimit) : '∞'} limit</div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, tokenPct)}%`, backgroundColor: tokenPct >= 90 ? '#ef4444' : tokenPct >= 70 ? '#f59e0b' : '#5DCAA5' }}
            />
          </div>
          {tokenPct >= 80 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} /> Approaching limit
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Actions this period</span>
            <Activity size={16} className="text-[#5DCAA5]" />
          </div>
          <div className="text-3xl font-bold text-[#1a1a2e] mb-1">{formatNumber(actionsUsed)}</div>
          <div className="text-xs text-gray-500 mb-3">of {isFinite(actionLimit) ? formatNumber(actionLimit) : '∞'} limit</div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, actionPct)}%`, backgroundColor: actionPct >= 90 ? '#ef4444' : actionPct >= 70 ? '#f59e0b' : '#5DCAA5' }}
            />
          </div>
          {actionPct >= 80 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} /> Approaching limit
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Estimated overage</span>
            <TrendingUp size={16} className={overageCost > 0 ? 'text-red-500' : 'text-gray-400'} />
          </div>
          <div className={`text-3xl font-bold mb-1 ${overageCost > 0 ? 'text-red-600' : 'text-[#1a1a2e]'}`}>
            {formatCurrency(overageCost)}
          </div>
          <div className="text-xs text-gray-500">
            {overageCost > 0
              ? `${formatNumber(tokensUsed - tokenLimit)} tokens over limit @ $${planLimits.overage_per_1k_tokens}/1K`
              : 'No overage this period'
            }
          </div>
          {overageCost > 0 && (
            <Link href="/dashboard/billing" className="text-xs text-[#5DCAA5] hover:underline mt-2 block">
              Upgrade plan to avoid overages →
            </Link>
          )}
        </div>
      </div>

      {/* Per-agent breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#1a1a2e]">Agent breakdown</h2>
          <p className="text-sm text-gray-500 mt-1">Token consumption and liability exposure by agent</p>
        </div>
        {!agents || agents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No agents registered yet. <Link href="/dashboard/agents" className="text-[#5DCAA5] hover:underline">Register an agent →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {agents.map((agent) => {
              const usage = agentUsageMap[agent.id] || { tokens: 0, actions: 0, toolCalls: 0, cost: 0 }
              const agentTokenLimit = agent.max_actions_per_day ? agent.max_actions_per_day * (agent.avg_tokens_per_action || 1000) : 0
              const estimatedExposure = usage.tokens > 0
                ? (usage.tokens / 1000) * EST_COST_PER_1K_TOKENS * (agent.detection_lag_minutes ? agent.detection_lag_minutes / 60 : 1)
                : 0
              const nearLimit = agentTokenLimit > 0 && usage.tokens > agentTokenLimit * 0.8
              const hasRisk = !agent.human_in_loop || (agent.detection_lag_minutes ?? 0) > 120 || agent.uses_tool_calls

              return (
                <div key={agent.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1a1a2e]">{agent.name}</span>
                        {nearLimit && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Near limit
                          </span>
                        )}
                        {hasRisk && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                            High exposure risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{agent.type.replace(/_/g, ' ')} {agent.model_name ? `· ${agent.model_name}` : ''}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>Est. liability exposure</div>
                      <div className="font-semibold text-gray-800">{formatCurrency(estimatedExposure)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mb-3">
                    <div>
                      <div className="text-gray-400 mb-0.5">Tokens</div>
                      <div className="font-medium">{formatNumber(usage.tokens)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Actions</div>
                      <div className="font-medium">{formatNumber(usage.actions)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Tool calls</div>
                      <div className="font-medium">{formatNumber(usage.toolCalls)}</div>
                    </div>
                  </div>

                  {agentTokenLimit > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24">Token usage</span>
                      <Bar value={usage.tokens} max={agentTokenLimit} />
                    </div>
                  )}

                  {/* Risk flags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {!agent.human_in_loop && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">No human oversight</span>
                    )}
                    {(agent.detection_lag_minutes ?? 0) > 60 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">High detection lag ({agent.detection_lag_minutes}min)</span>
                    )}
                    {agent.uses_tool_calls && (
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Tool call chaining</span>
                    )}
                    {agent.risk_score !== null && agent.risk_score !== undefined && agent.risk_score >= 70 && (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">High risk score ({agent.risk_score})</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Usage records history */}
      {usageRecords && usageRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-[#1a1a2e]">Usage history</h2>
            <p className="text-sm text-gray-500 mt-1">Recent usage records across all agents</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Agent</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Tokens</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Tool calls</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usageRecords.slice(0, 20).map((rec) => {
                  const agentInfo = Array.isArray(rec.agents) ? rec.agents[0] : rec.agents
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-[#1a1a2e]">{agentInfo?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {new Date(rec.period_start).toLocaleDateString()} – {new Date(rec.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">{formatNumber(Number(rec.total_tokens))}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{formatNumber(Number(rec.total_actions))}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{formatNumber(Number(rec.total_tool_calls))}</td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        {rec.estimated_cost_usd ? formatCurrency(Number(rec.estimated_cost_usd)) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!usageRecords || usageRecords.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Activity size={40} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No usage records yet</h3>
          <p className="text-gray-500 text-sm">Usage records will appear here once your agents start processing requests.</p>
        </div>
      )}
    </div>
  )
}
