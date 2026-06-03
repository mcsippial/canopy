'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, Plus, RefreshCw, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Agent } from '@/types'
import type { UnderwritingDecision } from '@/lib/underwriting'
import type { AgentMonitoringStats } from '@/app/api/agents/monitoring-stats/route'

const AI_MODELS = [
  { label: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', provider: 'openai' },
  { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  { label: 'Claude Opus 4', value: 'claude-opus-4-20250514', provider: 'anthropic' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', provider: 'google' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', provider: 'google' },
  { label: 'Mistral Large', value: 'mistral-large-latest', provider: 'mistral' },
  { label: 'Other', value: 'other', provider: 'other' },
]

function MonitoringDot({ status, lastSeenAt, actionsToday, violationsCount }: {
  status: AgentMonitoringStats['monitoringStatus'] | undefined
  lastSeenAt: string | null | undefined
  actionsToday: number | undefined
  violationsCount: number | undefined
}) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
  }
  const labels = {
    green: 'Active, no violations',
    yellow: 'Violations detected or not recently seen',
    red: 'Blocked actions or suspended',
  }

  const formatRelative = (ts: string | null | undefined) => {
    if (!ts) return 'Never'
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  }

  const dotColor = status ? colors[status] : 'bg-gray-300'
  const label = status ? labels[status] : 'No monitoring data'

  const tooltip = [
    label,
    `Last seen: ${formatRelative(lastSeenAt)}`,
    actionsToday !== undefined ? `Actions today: ${actionsToday}` : null,
    violationsCount !== undefined && violationsCount > 0 ? `Violations: ${violationsCount}` : null,
  ].filter(Boolean).join('\n')

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-gray-500`}
      title={tooltip}
    >
      <span className={`w-2 h-2 rounded-full inline-block ${dotColor}`} />
      {actionsToday !== undefined ? (
        <span>{actionsToday} today</span>
      ) : null}
      {violationsCount !== undefined && violationsCount > 0 ? (
        <span className="text-amber-600 font-medium">{violationsCount} violations</span>
      ) : null}
    </span>
  )
}

function RiskScore({ score }: { score: number | undefined | null }) {
  if (score === null || score === undefined) return <span className="text-gray-400 text-sm">Pending</span>
  const color = score < 30 ? 'text-green-600 bg-green-50' : score < 70 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
      {score}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

type UnderwritingRecord = {
  id: string
  agent_id: string
  decision: 'approved' | 'declined' | 'referred'
  eligible: boolean
  recommended_plan: string | null
  per_agent_sublimit: number
  per_incident_limit: number
  deductible: number
  exclusions: string[]
  conditions: string[]
  underwriting_basis: UnderwritingDecision['underwriting_basis']
  risk_score_locked: number
  locked_at: string
}

function UnderwritingBadge({
  agent,
  underwriting,
  onUnderwrite,
  underwritingId,
}: {
  agent: Agent
  underwriting: UnderwritingRecord | null
  onUnderwrite: (id: string) => void
  underwritingId: string | null
}) {
  const isUnderwriting = underwritingId === agent.id

  if (!agent.risk_score) {
    return <span className="text-gray-400 text-xs">Score first</span>
  }

  if (!underwriting || agent.underwriting_status === 'pending') {
    return (
      <button
        onClick={() => onUnderwrite(agent.id)}
        disabled={isUnderwriting}
        className="text-xs text-[#5DCAA5] hover:text-[#4ab893] font-medium disabled:opacity-50 flex items-center gap-1"
      >
        {isUnderwriting ? (
          <><RefreshCw size={12} className="animate-spin" /> Running...</>
        ) : (
          'Run underwriting →'
        )}
      </button>
    )
  }

  if (underwriting.decision === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Approved — {formatCurrency(underwriting.per_agent_sublimit)} sublimit
      </span>
    )
  }

  if (underwriting.decision === 'declined') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded cursor-help"
        title={underwriting.underwriting_basis ? `Risk score: ${underwriting.risk_score_locked}` : ''}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Declined
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Referred
    </span>
  )
}

function UnderwritingResultCard({ underwriting }: { underwriting: UnderwritingRecord }) {
  const decisionColors = {
    approved: 'border-green-200 bg-green-50',
    declined: 'border-red-200 bg-red-50',
    referred: 'border-amber-200 bg-amber-50',
  }
  const badgeColors = {
    approved: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    referred: 'bg-amber-100 text-amber-800',
  }
  const decisionLabels = {
    approved: 'Approved',
    declined: 'Declined',
    referred: 'Pending Manual Review',
  }

  return (
    <div className={`mt-3 p-4 rounded-lg border ${decisionColors[underwriting.decision]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColors[underwriting.decision]}`}>
          {decisionLabels[underwriting.decision]}
        </span>
        <span className="text-xs text-gray-500">
          Risk score locked as of {formatDate(underwriting.locked_at)}
        </span>
      </div>

      {underwriting.decision === 'declined' && (
        <p className="text-sm text-red-700 mb-2">{underwriting.underwriting_basis ? 'See reason above' : 'Agent does not meet underwriting criteria'}</p>
      )}
      {underwriting.decision === 'referred' && (
        <p className="text-sm text-amber-700 mb-2">Referred to manual review. Our underwriting team will be in touch.</p>
      )}

      {underwriting.decision !== 'declined' && underwriting.per_agent_sublimit > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Sublimit</p>
            <p className="text-sm font-semibold">{formatCurrency(underwriting.per_agent_sublimit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Per Incident</p>
            <p className="text-sm font-semibold">{formatCurrency(underwriting.per_incident_limit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deductible</p>
            <p className="text-sm font-semibold">{formatCurrency(underwriting.deductible)}</p>
          </div>
        </div>
      )}

      {underwriting.exclusions && underwriting.exclusions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Key Exclusions</p>
          <ul className="space-y-0.5">
            {underwriting.exclusions.slice(0, 3).map((ex, i) => (
              <li key={i} className="text-xs text-gray-500">• {ex}</li>
            ))}
          </ul>
        </div>
      )}

      {underwriting.conditions && underwriting.conditions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Conditions</p>
          <ul className="space-y-0.5">
            {underwriting.conditions.slice(0, 2).map((c, i) => (
              <li key={i} className="text-xs text-gray-500">• {c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type FormState = {
  name: string
  type: Agent['type']
  description: string
  actions_description: string
  connected_systems: string
  model_name: string
  model_provider: string
  avg_tokens_per_action: string
  pricing_model: string
  max_actions_per_day: string
  deployment_type: string
  uses_tool_calls: boolean
  max_tool_call_depth: string
  human_in_loop: boolean
  detection_lag_minutes: string
}

const defaultForm: FormState = {
  name: '',
  type: 'customer_service',
  description: '',
  actions_description: '',
  connected_systems: '',
  model_name: '',
  model_provider: '',
  avg_tokens_per_action: '',
  pricing_model: 'per_token',
  max_actions_per_day: '',
  deployment_type: 'realtime',
  uses_tool_calls: false,
  max_tool_call_depth: '',
  human_in_loop: false,
  detection_lag_minutes: '',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [underwritings, setUnderwritings] = useState<Record<string, UnderwritingRecord>>({})
  const [monitoringStats, setMonitoringStats] = useState<Record<string, AgentMonitoringStats>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [underwritingId, setUnderwritingId] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(defaultForm)

  async function fetchUnderwriting(agentId: string) {
    const res = await fetch(`/api/underwriting/${agentId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.underwriting) {
        setUnderwritings(prev => ({ ...prev, [agentId]: data.underwriting }))
      }
    }
  }

  const fetchMonitoringStats = useCallback(async () => {
    const res = await fetch('/api/agents/monitoring-stats')
    if (res.ok) {
      const data: AgentMonitoringStats[] = await res.json()
      const statsMap: Record<string, AgentMonitoringStats> = {}
      for (const s of data) statsMap[s.agentId] = s
      setMonitoringStats(statsMap)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    if (res.ok) {
      const data = await res.json()
      setAgents(data)
      for (const agent of data) {
        if (agent.current_underwriting_id) {
          fetchUnderwriting(agent.id)
        }
      }
    }
    setLoading(false)
    fetchMonitoringStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  function handleModelChange(modelValue: string) {
    const model = AI_MODELS.find(m => m.value === modelValue)
    setForm(f => ({
      ...f,
      model_name: modelValue,
      model_provider: model?.provider || f.model_provider,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        description: form.description || undefined,
        actions_description: form.actions_description || undefined,
        connected_systems: form.connected_systems || undefined,
        model_name: form.model_name || undefined,
        model_provider: form.model_provider || undefined,
        pricing_model: form.pricing_model || undefined,
        deployment_type: form.deployment_type || undefined,
        uses_tool_calls: form.uses_tool_calls,
        human_in_loop: form.human_in_loop,
      }
      if (form.avg_tokens_per_action) payload.avg_tokens_per_action = parseInt(form.avg_tokens_per_action)
      if (form.max_actions_per_day) payload.max_actions_per_day = parseInt(form.max_actions_per_day)
      if (form.uses_tool_calls && form.max_tool_call_depth) payload.max_tool_call_depth = parseInt(form.max_tool_call_depth)
      if (form.detection_lag_minutes) payload.detection_lag_minutes = parseInt(form.detection_lag_minutes)

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to register agent')
        return
      }
      toast.success('Agent registered and risk scored')
      setAgents([data, ...agents])
      setShowModal(false)
      setForm(defaultForm)
    } catch {
      toast.error('Failed to register agent')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRescore(agentId: string) {
    const agent = agents.find(a => a.id === agentId)
    if (agent?.risk_score_locked_at) {
      const confirmed = window.confirm(
        'Re-scoring will invalidate the current underwriting decision and require re-underwriting. Continue?'
      )
      if (!confirmed) return
    }
    setScoringId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/score`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Re-scoring failed')
        return
      }
      if (data._warning) {
        toast.warning(data._warning)
      } else {
        toast.success('Risk score updated')
      }
      // Remove old underwriting if invalidated
      if (data.underwriting_status === 'pending') {
        setUnderwritings(prev => {
          const next = { ...prev }
          delete next[agentId]
          return next
        })
      }
      setAgents(agents.map(a => a.id === agentId ? { ...a, ...data } : a))
    } catch {
      toast.error('Re-scoring failed')
    } finally {
      setScoringId(null)
    }
  }

  async function handleUnderwrite(agentId: string) {
    setUnderwritingId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/underwrite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Underwriting failed')
        return
      }
      toast.success(`Underwriting complete: ${data.decision.decision}`)
      setAgents(agents.map(a => a.id === agentId ? { ...a, ...data.agent } : a))
      setUnderwritings(prev => ({ ...prev, [agentId]: data.underwriting }))
      setExpandedAgent(agentId)
    } catch {
      toast.error('Underwriting failed')
    } finally {
      setUnderwritingId(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Agents</h1>
          <p className="text-gray-600 mt-1">Register and manage your AI agents.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Register agent
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Bot size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No agents yet</h3>
          <p className="text-gray-500 mb-6">Register your first AI agent to get a risk assessment and activate coverage.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Register your first agent
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Model</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Risk Score</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Underwriting</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Sublimit</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Monitoring</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => {
                const uw = underwritings[agent.id] ?? null
                const mStats = monitoringStats[agent.id]
                return (
                  <>
                    <tr
                      key={agent.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#1a1a2e]">{agent.name}</div>
                        {agent.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{agent.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{agent.type.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {agent.model_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {agent.model_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <RiskScore score={agent.risk_score} />
                          {agent.risk_level && <StatusPill status={agent.risk_level} />}
                          {agent.risk_score_locked_at && (
                            <span className="text-xs text-gray-400" title={`Score locked ${formatDate(agent.risk_score_locked_at)}`}>🔒</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <UnderwritingBadge
                          agent={agent}
                          underwriting={uw}
                          onUnderwrite={handleUnderwrite}
                          underwritingId={underwritingId}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {uw && uw.decision === 'approved'
                          ? <span className="text-green-700 font-medium">{formatCurrency(uw.per_agent_sublimit)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4"><StatusPill status={agent.status} /></td>
                      <td className="px-6 py-4">
                        <MonitoringDot
                          status={mStats?.monitoringStatus}
                          lastSeenAt={mStats?.lastSeenAt}
                          actionsToday={mStats?.actionsToday}
                          violationsCount={mStats?.violationsCount}
                        />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRescore(agent.id)}
                          disabled={scoringId === agent.id}
                          className="text-gray-400 hover:text-[#5DCAA5] transition-colors disabled:opacity-50"
                          title={agent.risk_score_locked_at ? 'Re-score (will invalidate underwriting)' : 'Re-run risk scoring'}
                        >
                          {agent.risk_score_locked_at
                            ? <AlertTriangle size={16} className="text-amber-400" />
                            : <RefreshCw size={16} className={scoringId === agent.id ? 'animate-spin' : ''} />}
                        </button>
                      </td>
                    </tr>
                    {expandedAgent === agent.id && uw && (
                      <tr key={`${agent.id}-detail`}>
                        <td colSpan={9} className="px-6 pb-4">
                          <UnderwritingResultCard underwriting={uw} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Register agent modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Register new agent</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Basic Info</h3>
                <div className="space-y-4">
                  <Input
                    label="Agent name"
                    required
                    placeholder="Customer Support Bot"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Select
                    label="Agent type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Agent['type'] })}
                  >
                    <option value="customer_service">Customer Service</option>
                    <option value="financial">Financial</option>
                    <option value="workflow">Workflow</option>
                    <option value="knowledge">Knowledge</option>
                    <option value="other">Other</option>
                  </Select>
                  <Textarea
                    label="Description"
                    placeholder="What does this agent do?"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <Textarea
                    label="Actions description"
                    placeholder="What actions can this agent perform? (e.g., send emails, make API calls, process payments)"
                    rows={2}
                    value={form.actions_description}
                    onChange={(e) => setForm({ ...form, actions_description: e.target.value })}
                  />
                  <Input
                    label="Connected systems"
                    placeholder="e.g., Stripe, Salesforce, internal DB"
                    value={form.connected_systems}
                    onChange={(e) => setForm({ ...form, connected_systems: e.target.value })}
                  />
                </div>
              </div>

              {/* AI Model */}
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">AI Model</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="AI model"
                      value={form.model_name}
                      onChange={(e) => handleModelChange(e.target.value)}
                    >
                      <option value="">Select model...</option>
                      {AI_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </Select>
                    <Select
                      label="Model provider"
                      value={form.model_provider}
                      onChange={(e) => setForm({ ...form, model_provider: e.target.value })}
                    >
                      <option value="">Select provider...</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                      <option value="mistral">Mistral</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Avg tokens per action"
                      type="number"
                      min="1"
                      placeholder="e.g., 1500"
                      hint="Estimate the average tokens your agent uses per response/action"
                      value={form.avg_tokens_per_action}
                      onChange={(e) => setForm({ ...form, avg_tokens_per_action: e.target.value })}
                    />
                    <Select
                      label="Pricing model"
                      value={form.pricing_model}
                      onChange={(e) => setForm({ ...form, pricing_model: e.target.value })}
                    >
                      <option value="per_token">Per token</option>
                      <option value="per_call">Per API call</option>
                      <option value="per_minute">Per minute</option>
                      <option value="flat_rate">Flat rate</option>
                      <option value="unknown">Unknown</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Deployment */}
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Deployment</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Deployment type"
                      value={form.deployment_type}
                      onChange={(e) => setForm({ ...form, deployment_type: e.target.value })}
                    >
                      <option value="realtime">Realtime</option>
                      <option value="batch">Batch</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="event_driven">Event-driven</option>
                    </Select>
                    <Input
                      label="Max actions per day"
                      type="number"
                      min="1"
                      placeholder="e.g., 5000"
                      value={form.max_actions_per_day}
                      onChange={(e) => setForm({ ...form, max_actions_per_day: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Uses tool calls?</div>
                      <div className="text-xs text-gray-500">Does this agent chain tool calls (function calling)?</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.uses_tool_calls}
                      onClick={() => setForm({ ...form, uses_tool_calls: !form.uses_tool_calls })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.uses_tool_calls ? 'bg-[#5DCAA5]' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.uses_tool_calls ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {form.uses_tool_calls && (
                    <Input
                      label="Max tool call depth"
                      type="number"
                      min="1"
                      placeholder="e.g., 3"
                      value={form.max_tool_call_depth}
                      onChange={(e) => setForm({ ...form, max_tool_call_depth: e.target.value })}
                    />
                  )}

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Human in the loop?</div>
                      <div className="text-xs text-gray-500">Is there a human checkpoint before the agent takes consequential actions?</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.human_in_loop}
                      onClick={() => setForm({ ...form, human_in_loop: !form.human_in_loop })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.human_in_loop ? 'bg-[#5DCAA5]' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.human_in_loop ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <Input
                    label="Estimated detection lag (minutes)"
                    type="number"
                    min="0"
                    placeholder="e.g., 30"
                    hint="How long typically before you would notice an error from this agent?"
                    value={form.detection_lag_minutes}
                    onChange={(e) => setForm({ ...form, detection_lag_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} className="flex-1">
                  Register &amp; score risk
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
