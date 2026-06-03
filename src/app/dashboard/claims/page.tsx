'use client'

import { useState, useEffect } from 'react'
import { FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Claim } from '@/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TriageResult({ result }: { result: Record<string, unknown> | null | undefined }) {
  if (!result) return null
  const rec = result.triage_recommendation as string
  const conf = result.confidence as number
  const reasoning = result.reasoning as string
  const flags = result.flags as string[] | undefined
  const nextSteps = result.next_steps as string

  const recColor = rec === 'likely_covered' ? 'text-green-700 bg-green-50' :
    rec === 'likely_not_covered' ? 'text-red-700 bg-red-50' :
    'text-yellow-700 bg-yellow-50'

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Triage (Internal — Not shown to claimants)</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${recColor}`}>
          {rec?.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-gray-500">Confidence: {conf}%</span>
      </div>
      {reasoning && <p className="text-sm text-gray-700 mb-2">{reasoning}</p>}
      {flags && flags.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500">Flags: </span>
          <span className="text-xs text-gray-700">{flags.join(', ')}</span>
        </div>
      )}
      {nextSteps && <p className="text-xs text-gray-600"><strong>Next steps:</strong> {nextSteps}</p>}
    </div>
  )
}

function ClaimRow({ claim }: { claim: Claim & { agents?: { name: string } | null } }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: claim.status, message: '', amount_approved: '' })

  const agent = Array.isArray(claim.agents) ? claim.agents[0] : claim.agents

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault()
    setUpdating(true)
    try {
      const body: Record<string, unknown> = {
        status: statusForm.status,
        message: statusForm.message,
      }
      if (statusForm.amount_approved) {
        body.amount_approved = parseFloat(statusForm.amount_approved)
      }
      const res = await fetch(`/api/claims/${claim.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Update failed')
        return
      }
      toast.success('Status updated')
      window.location.reload()
    } catch {
      toast.error('Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-6 py-4">
          <div className="font-mono text-sm font-medium text-[#1a1a2e]">{claim.claim_number}</div>
          <div className="text-xs text-gray-500">{formatDate(claim.created_at)}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-[#1a1a2e]">{claim.claimant_name}</div>
          <div className="text-xs text-gray-500">{claim.claimant_email}</div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">{agent?.name || '—'}</td>
        <td className="px-6 py-4 text-sm font-medium text-[#1a1a2e]">${Number(claim.amount_claimed).toLocaleString()}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {claim.amount_approved != null ? `$${Number(claim.amount_approved).toLocaleString()}` : '—'}
        </td>
        <td className="px-6 py-4"><StatusPill status={claim.status} /></td>
        <td className="px-6 py-4">
          {claim.ai_triage_status === 'completed' && claim.ai_triage_result && (
            <span className="text-xs text-[#5DCAA5] font-medium">Triaged</span>
          )}
          {claim.ai_triage_status === 'processing' && (
            <span className="text-xs text-amber-500">Processing...</span>
          )}
        </td>
        <td className="px-6 py-4 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-6 pb-6 bg-gray-50 border-b border-gray-200">
            <div className="pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{claim.description}</p>
              </div>
              {claim.financial_impact_description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Financial impact</h4>
                  <p className="text-sm text-gray-600">{claim.financial_impact_description}</p>
                </div>
              )}
              <TriageResult result={claim.ai_triage_result as Record<string, unknown> | null} />
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Update status</h4>
                <form onSubmit={handleStatusUpdate} className="flex gap-3 items-end flex-wrap">
                  <Select
                    label="New status"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as Claim['status'] })}
                    className="w-40"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="pending_docs">Pending Docs</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="paid">Paid</option>
                  </Select>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message to claimant</label>
                    <input
                      required
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
                      placeholder="e.g., We are reviewing your documentation..."
                      value={statusForm.message}
                      onChange={(e) => setStatusForm({ ...statusForm, message: e.target.value })}
                    />
                  </div>
                  {['approved', 'paid'].includes(statusForm.status) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount approved ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
                        value={statusForm.amount_approved}
                        onChange={(e) => setStatusForm({ ...statusForm, amount_approved: e.target.value })}
                      />
                    </div>
                  )}
                  <Button type="submit" loading={updating} size="sm">Update</Button>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch('/api/claims').then(r => r.json()).then(d => {
      setClaims(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const filtered = statusFilter ? claims.filter(c => c.status === statusFilter) : claims

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Claims</h1>
          <p className="text-gray-600 mt-1">Review and manage submitted claims.</p>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="pending_docs">Pending Docs</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No claims</h3>
          <p className="text-gray-500">Claims submitted through your embedded badge will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Claim #</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Claimant</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Agent</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Amount Claimed</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Amount Approved</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">AI Triage</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((claim) => (
                <ClaimRow key={claim.id} claim={claim as Claim & { agents?: { name: string } | null }} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
