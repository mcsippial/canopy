'use client'

import { useState, useEffect } from 'react'
import { Bot, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Agent } from '@/types'

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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoringId, setScoringId] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(defaultForm)

  async function fetchAgents() {
    const res = await fetch('/api/agents')
    if (res.ok) {
      const data = await res.json()
      setAgents(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAgents() }, [])

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
    setScoringId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/score`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Re-scoring failed')
        return
      }
      toast.success('Risk score updated')
      setAgents(agents.map(a => a.id === agentId ? { ...a, ...data } : a))
    } catch {
      toast.error('Re-scoring failed')
    } finally {
      setScoringId(null)
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
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Registered</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
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
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusPill status={agent.status} /></td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(agent.created_at)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRescore(agent.id)}
                      disabled={scoringId === agent.id}
                      className="text-gray-400 hover:text-[#5DCAA5] transition-colors disabled:opacity-50"
                      title="Re-run risk scoring"
                    >
                      <RefreshCw size={16} className={scoringId === agent.id ? 'animate-spin' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
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

                  {/* Uses tool calls toggle */}
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

                  {/* Human in the loop toggle */}
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
