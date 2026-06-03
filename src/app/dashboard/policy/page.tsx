'use client'

import { useState, useEffect } from 'react'
import { Shield, FileText, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { PolicyDocument } from '@/lib/policyGenerator'

type PolicyRecord = {
  id: string
  policy_number: string
  status: 'draft' | 'active' | 'expired' | 'canceled'
  document: PolicyDocument
  aggregate_limit: number
  per_incident_limit: number
  premium_monthly: number
  effective_at: string
  expires_at: string
  issued_at: string
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function PolicyView({ policy }: { policy: PolicyRecord }) {
  const doc = policy.document
  return (
    <div className="bg-white rounded-xl border border-gray-200 print:border-0 print:shadow-none">
      {/* Header */}
      <div className="p-8 border-b border-gray-200 print:pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5DCAA5]/10 p-3 rounded-xl">
              <Shield size={28} className="text-[#5DCAA5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">AI Agent Liability Policy</h1>
              <p className="text-gray-500 mt-0.5">Canopy Insurance — {doc.coverage_territory}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Policy Number</div>
            <div className="text-lg font-mono font-bold text-[#1a1a2e]">{doc.policy_number}</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
              policy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Insured Organization</div>
            <div className="font-semibold text-[#1a1a2e]">{doc.insured_organization.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Effective Date</div>
            <div className="font-semibold text-[#1a1a2e]">{formatDate(doc.effective_at)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expiration Date</div>
            <div className="font-semibold text-[#1a1a2e]">{formatDate(doc.expires_at)}</div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Coverage Summary */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Coverage Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Aggregate Limit</div>
              <div className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(doc.aggregate_limit)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Per Incident Limit</div>
              <div className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(doc.per_incident_limit)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Monthly Premium</div>
              <div className="text-xl font-bold text-[#1a1a2e]">
                {doc.premium_monthly === 0 ? 'Custom' : formatCurrency(doc.premium_monthly)}
              </div>
            </div>
          </div>
        </section>

        {/* Covered Agents */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Covered Agents</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Agent Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Risk Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sublimit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Deductible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doc.covered_agents.map((agent) => (
                  <tr key={agent.agent_id}>
                    <td className="px-4 py-3 font-medium text-[#1a1a2e]">{agent.agent_name}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{agent.agent_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {agent.model_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        agent.risk_score_at_issuance < 30 ? 'text-green-600 bg-green-50' :
                        agent.risk_score_at_issuance < 70 ? 'text-amber-600 bg-amber-50' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {agent.risk_score_at_issuance}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(agent.sublimit)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(agent.deductible)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Covered Events */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">Covered Events</h2>
          <ul className="space-y-2">
            {doc.covered_events.map((event, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{event}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Exclusions */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">Exclusions</h2>
          <ul className="space-y-2">
            {doc.exclusions.map((ex, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{ex}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Conditions */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">Policy Conditions</h2>
          <ol className="space-y-2">
            {doc.conditions.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                <span className="text-sm text-gray-700">{c}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Claims Process */}
        <section>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">Claims Process</h2>
          <ol className="space-y-2">
            {doc.claims_process.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5DCAA5]/10 text-[#5DCAA5] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 mt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>Governing Law: {doc.governing_law}</p>
          <p>Issued: {formatDate(doc.issued_at)}</p>
          <p>This policy document is generated by Canopy and is subject to the full terms and conditions of your coverage agreement.</p>
        </div>
      </div>
    </div>
  )
}

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchPolicy() {
    setLoading(true)
    setError(null)
    try {
      // Get org's active policy
      const res = await fetch('/api/policy')
      if (res.ok) {
        const data = await res.json()
        setPolicy(data.policy ?? null)
      } else if (res.status !== 404) {
        const data = await res.json()
        setError(data.error ?? 'Failed to load policy')
      }
    } catch {
      setError('Failed to load policy')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPolicy() }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/policy/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate policy')
        toast.error(data.error ?? 'Failed to generate policy')
        return
      }
      toast.success('Policy generated successfully!')
      setPolicy({ ...data.policy, document: data.document })
    } catch {
      toast.error('Failed to generate policy')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Policy</h1>
          <p className="text-gray-600 mt-1">Your AI agent liability coverage document.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          {policy && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Download size={16} /> Download PDF
              </Button>
              <Button variant="outline" onClick={fetchPolicy}>
                <RefreshCw size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          {error.includes('approved') && (
            <p className="text-gray-500 text-sm mt-2">
              Go to <a href="/dashboard/agents" className="text-[#5DCAA5] underline">Agents</a> to underwrite and approve agents first.
            </p>
          )}
        </div>
      ) : !policy ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No active policy</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You need at least one underwritten and approved agent before a policy can be issued.
            Once you have approved agents, generate your policy here.
          </p>
          <Button onClick={handleGenerate} loading={generating}>
            Generate Policy
          </Button>
        </div>
      ) : (
        <PolicyView policy={policy} />
      )}
    </div>
  )
}
