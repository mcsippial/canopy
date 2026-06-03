'use client'

import { useState, useEffect } from 'react'
import { Bot, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Agent } from '@/types'

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoringId, setScoringId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    type: 'customer_service' as Agent['type'],
    description: '',
    actions_description: '',
    connected_systems: '',
  })

  async function fetchAgents() {
    const res = await fetch('/api/agents')
    if (res.ok) {
      const data = await res.json()
      setAgents(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAgents() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to register agent')
        return
      }
      toast.success('Agent registered and risk scored')
      setAgents([data, ...agents])
      setShowModal(false)
      setForm({ name: '', type: 'customer_service', description: '', actions_description: '', connected_systems: '' })
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Register new agent</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <Textarea
                label="Actions description"
                placeholder="What actions can this agent perform? (e.g., send emails, make API calls, process payments)"
                rows={3}
                value={form.actions_description}
                onChange={(e) => setForm({ ...form, actions_description: e.target.value })}
              />
              <Input
                label="Connected systems"
                placeholder="e.g., Stripe, Salesforce, internal DB"
                value={form.connected_systems}
                onChange={(e) => setForm({ ...form, connected_systems: e.target.value })}
              />
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
