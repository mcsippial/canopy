import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bot, Users, Shield, FileText, TrendingUp } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import { PLAN_LIMITS } from '@/types'

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DashboardPage() {
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

  // Fetch stats in parallel
  const [agentsRes, usersRes, claimsRes, policyRes] = await Promise.all([
    supabase.from('agents').select('id, name, type, status, risk_score, risk_level, created_at').eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('covered_users').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('claims').select('id, claim_number, status, amount_claimed, claimant_name, created_at, agents(name)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
    supabase.from('policies').select('*').eq('org_id', orgId).eq('status', 'active').single(),
  ])

  const agents = agentsRes.data || []
  const userCount = usersRes.count || 0
  const recentClaims = claimsRes.data || []
  const activePolicy = policyRes.data

  const openClaims = recentClaims.filter(c => ['submitted', 'under_review', 'pending_docs'].includes(c.status)).length
  const activeAgents = agents.filter(a => a.status === 'active').length

  const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
  const planLimits = PLAN_LIMITS[planKey]

  const coverageLimit = activePolicy?.coverage_limit || planLimits.coverage || 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Overview</h1>
        <p className="text-gray-600 mt-1">Welcome back. Here&apos;s your coverage summary.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Agents', value: activeAgents, icon: Bot, sub: `${agents.length} total registered` },
          { label: 'Covered Users', value: userCount.toLocaleString(), icon: Users, sub: planLimits.users === Infinity ? 'Unlimited' : `of ${planLimits.users.toLocaleString()} limit` },
          { label: 'Coverage Limit', value: formatCurrency(coverageLimit), icon: Shield, sub: org?.plan === 'none' ? 'No active plan' : `${org?.plan} plan` },
          { label: 'Open Claims', value: openClaims, icon: FileText, sub: `${recentClaims.length} recent total` },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                <div className="bg-[#5DCAA5]/10 p-2 rounded-lg">
                  <Icon size={18} className="text-[#5DCAA5]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#1a1a2e] mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Plan status */}
      {org?.plan === 'none' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 flex items-center gap-4">
          <TrendingUp size={24} className="text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">No active plan</h3>
            <p className="text-sm text-amber-700">Choose a plan to activate coverage for your agents and users.</p>
          </div>
          <a href="/dashboard/billing" className="ml-auto bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap">
            View plans
          </a>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Agents table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#1a1a2e]">Agents</h2>
            <a href="/dashboard/agents" className="text-sm text-[#5DCAA5] hover:underline">View all</a>
          </div>
          {agents.length === 0 ? (
            <div className="p-8 text-center">
              <Bot size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No agents registered yet.</p>
              <a href="/dashboard/agents" className="text-[#5DCAA5] text-sm font-medium hover:underline mt-2 block">Register your first agent →</a>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1a1a2e] truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{agent.type.replace(/_/g, ' ')}</p>
                  </div>
                  {agent.risk_score !== null && agent.risk_score !== undefined && (
                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      agent.risk_score < 30 ? 'bg-green-100 text-green-700' :
                      agent.risk_score < 70 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {agent.risk_score}
                    </div>
                  )}
                  <StatusPill status={agent.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent claims */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#1a1a2e]">Recent Claims</h2>
            <a href="/dashboard/claims" className="text-sm text-[#5DCAA5] hover:underline">View all</a>
          </div>
          {recentClaims.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No claims submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentClaims.map((claim) => {
                const agent = Array.isArray(claim.agents) ? claim.agents[0] : claim.agents
                return (
                  <div key={claim.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#1a1a2e]">{claim.claim_number}</p>
                      <p className="text-xs text-gray-500">{claim.claimant_name} · {formatDate(claim.created_at)}</p>
                      {agent && <p className="text-xs text-gray-400">{agent.name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#1a1a2e]">${Number(claim.amount_claimed).toLocaleString()}</p>
                      <StatusPill status={claim.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
