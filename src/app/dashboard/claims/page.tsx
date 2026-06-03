'use client'

import { useState, useEffect } from 'react'
import { FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, MessageSquare, Send } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Claim } from '@/types'
import type { CoverageCheckResult } from '@/lib/ai'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CoverageStatus({ result }: { result: CoverageCheckResult | null | undefined }) {
  if (!result) return null

  return (
    <div className="mt-4 rounded-lg border overflow-hidden">
      {/* Banner */}
      {result.coverage_eligible ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">
            Coverage verified — this claim falls within active policy {result.policy_number ?? ''}
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-red-800">Coverage issue detected</span>
          </div>
          {result.denial_reasons.length > 0 && (
            <ul className="ml-6 list-disc text-xs text-red-700 space-y-0.5">
              {result.denial_reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Details grid */}
      <div className="px-4 py-3 bg-white grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <div>
          <span className="text-gray-500">Policy number</span>
          <div className="font-medium text-gray-800 font-mono">{result.policy_number ?? '—'}</div>
        </div>
        <div>
          <span className="text-gray-500">Agent sublimit</span>
          <div className="font-medium text-gray-800">
            {result.agent_sublimit != null ? `$${result.agent_sublimit.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Per-incident limit</span>
          <div className="font-medium text-gray-800">
            {result.per_incident_limit != null ? `$${result.per_incident_limit.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Deductible</span>
          <div className="font-medium text-gray-800">
            {result.deductible != null ? `$${result.deductible.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Incident within policy period</span>
          <div className={`font-medium ${result.incident_within_policy_period ? 'text-green-700' : 'text-red-700'}`}>
            {result.incident_within_policy_period ? 'Yes' : 'No'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Agent covered</span>
          <div className={`font-medium ${result.agent_is_covered ? 'text-green-700' : 'text-red-700'}`}>
            {result.agent_is_covered ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  )
}

function TriageResult({ result }: { result: Record<string, unknown> | null | undefined }) {
  if (!result) return null
  const rec = result.triage_recommendation as string
  const conf = result.confidence as number
  const reasoning = result.reasoning as string
  const flags = result.flags as string[] | undefined
  const nextSteps = result.next_steps as string
  const applicableCoveredEvents = result.applicable_covered_events as string[] | undefined
  const triggeredExclusions = result.triggered_exclusions as string[] | undefined
  const breachedConditions = result.breached_conditions as string[] | undefined
  const recommendedPayoutBasis = result.recommended_payout_basis as string | undefined

  const recColor = rec === 'likely_covered' ? 'text-green-700 bg-green-50' :
    rec === 'likely_not_covered' ? 'text-red-700 bg-red-50' :
    'text-yellow-700 bg-yellow-50'

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Triage — Internal Recommendation Only — Not a Coverage Determination</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${recColor}`}>
          {rec?.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-gray-500">Confidence: {conf}%</span>
      </div>

      {reasoning && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-1">Reasoning</h5>
          <p className="text-sm text-gray-700">{reasoning}</p>
        </div>
      )}

      {applicableCoveredEvents && applicableCoveredEvents.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-green-700 mb-1">Potentially applicable covered events</h5>
          <ul className="space-y-1">
            {applicableCoveredEvents.map((e, i) => (
              <li key={i} className="text-xs text-gray-700 bg-green-50 border border-green-100 rounded px-2 py-1">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {triggeredExclusions && triggeredExclusions.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-amber-700 mb-1">Potentially applicable exclusions</h5>
          <ul className="space-y-1">
            {triggeredExclusions.map((e, i) => (
              <li key={i} className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {breachedConditions && breachedConditions.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-red-700 mb-1">Potential condition breaches</h5>
          <ul className="space-y-1">
            {breachedConditions.map((c, i) => (
              <li key={i} className="text-xs text-gray-700 bg-red-50 border border-red-100 rounded px-2 py-1">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendedPayoutBasis && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-1">Recommended payout basis</h5>
          <p className="text-xs text-gray-700">{recommendedPayoutBasis}</p>
        </div>
      )}

      {flags && flags.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500">Flags: </span>
          <span className="text-xs text-gray-700">{flags.join(', ')}</span>
        </div>
      )}
      {nextSteps && <p className="text-xs text-gray-600"><strong>Next steps:</strong> {nextSteps}</p>}

      <p className="mt-3 text-xs text-gray-400 italic">Internal recommendation only — not a coverage determination. Final determinations are made by licensed claims examiners.</p>
    </div>
  )
}

interface ClaimNote {
  id: string
  note: string
  user_id: string | null
  created_at: string
}

function ClaimsExaminerPanel({ claimId }: { claimId: string }) {
  const [notes, setNotes] = useState<ClaimNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [docRequest, setDocRequest] = useState('')
  const [showDocModal, setShowDocModal] = useState(false)
  const [sendingDocRequest, setSendingDocRequest] = useState(false)
  const [examinerStatus, setExaminerStatus] = useState('')
  const [amountApproved, setAmountApproved] = useState('')
  const [rationale, setRationale] = useState('')
  const [updatingExaminer, setUpdatingExaminer] = useState(false)

  useEffect(() => {
    fetch(`/api/claims/${claimId}/notes`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotes(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [claimId])

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/claims/${claimId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      })
      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [...prev, created])
        setNewNote('')
        toast.success('Note added')
      } else {
        toast.error('Failed to add note')
      }
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  async function handleExaminerStatusUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!examinerStatus) return
    if (rationale.length < 20) {
      toast.error('Decision rationale must be at least 20 characters')
      return
    }
    setUpdatingExaminer(true)
    try {
      const publicMessage = examinerStatus === 'approved'
        ? 'Your claim has been approved. We will be in touch regarding payment.'
        : examinerStatus === 'denied'
        ? 'After review, we are unable to approve this claim. Please contact us if you have questions.'
        : `Your claim status has been updated to: ${examinerStatus.replace(/_/g, ' ')}.`

      const body: Record<string, unknown> = {
        status: examinerStatus,
        message: publicMessage,
      }
      if (amountApproved && ['approved', 'paid'].includes(examinerStatus)) {
        body.amount_approved = parseFloat(amountApproved)
      }

      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        // Also save rationale as internal note
        await fetch(`/api/claims/${claimId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: `[Decision rationale — ${examinerStatus}] ${rationale}` }),
        })
        toast.success('Status updated')
        window.location.reload()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    } finally {
      setUpdatingExaminer(false)
    }
  }

  async function handleDocRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!docRequest.trim()) return
    setSendingDocRequest(true)
    try {
      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending_docs',
          message: `Additional documentation requested: ${docRequest}`,
          public: true,
        }),
      })
      if (res.ok) {
        toast.success('Documentation request sent')
        setShowDocModal(false)
        setDocRequest('')
        window.location.reload()
      } else {
        toast.error('Failed to send request')
      }
    } catch {
      toast.error('Failed to send request')
    } finally {
      setSendingDocRequest(false)
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 mt-4">
      <h4 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
        <MessageSquare size={16} />
        Claims Examiner Panel — Internal
      </h4>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Notes */}
        <div>
          <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Internal Notes</h5>
          {notes.length === 0 ? (
            <p className="text-xs text-gray-400 italic mb-3">No notes yet.</p>
          ) : (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add internal note..."
              rows={2}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <Button type="submit" loading={addingNote} size="sm" className="self-end">
              <Send size={14} />
            </Button>
          </form>
        </div>

        {/* Decision + Doc Request */}
        <div className="space-y-4">
          <div>
            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Update Decision</h5>
            <form onSubmit={handleExaminerStatusUpdate} className="space-y-3">
              <Select
                label="Status"
                value={examinerStatus}
                onChange={(e) => setExaminerStatus(e.target.value)}
              >
                <option value="">Select status...</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="pending_docs">Pending Docs</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="paid">Paid</option>
              </Select>
              {examinerStatus && ['approved', 'paid'].includes(examinerStatus) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount approved ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={amountApproved}
                    onChange={(e) => setAmountApproved(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decision rationale <span className="text-gray-400 font-normal">(internal, min 20 chars)</span>
                </label>
                <textarea
                  required
                  minLength={20}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  placeholder="Explain the basis for this decision..."
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">{rationale.length} / 20 chars minimum</p>
              </div>
              <Button
                type="submit"
                loading={updatingExaminer}
                size="sm"
                disabled={!examinerStatus || rationale.length < 20}
              >
                Update Status
              </Button>
            </form>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Documentation</h5>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowDocModal(true)}
            >
              Request Documentation
            </Button>

            {showDocModal && (
              <form onSubmit={handleDocRequest} className="mt-3 space-y-2">
                <textarea
                  required
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  placeholder="What documentation is needed? (visible to claimant)"
                  value={docRequest}
                  onChange={(e) => setDocRequest(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" loading={sendingDocRequest} size="sm">Send Request</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowDocModal(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
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

  const coverageCheck = claim.coverage_check_result as CoverageCheckResult | null | undefined

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
          {coverageCheck != null && (
            <span className={`text-xs font-medium ${coverageCheck.coverage_eligible ? 'text-green-600' : 'text-red-600'}`}>
              {coverageCheck.coverage_eligible ? 'Eligible' : 'Issue'}
            </span>
          )}
        </td>
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
          <td colSpan={9} className="px-6 pb-6 bg-gray-50 border-b border-gray-200">
            <div className="pt-4 space-y-4">
              {/* Coverage Status — prominent at top */}
              <CoverageStatus result={coverageCheck} />

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

              {/* Claims Examiner Panel */}
              <ClaimsExaminerPanel claimId={claim.id} />

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick status update</h4>
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
                <th className="text-left px-6 py-3 font-medium text-gray-600">Coverage</th>
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
