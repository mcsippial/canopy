'use client'

import { useState, useEffect } from 'react'
import { Shield, Clock, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'

interface PublicClaimData {
  claim_number: string
  status: string
  amount_claimed: number
  amount_approved?: number
  deductible?: number
  incident_date?: string
  created_at: string
  events: Array<{
    id: string
    status: string
    message: string
    created_at: string
  }>
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  pending_docs: 'Pending Documentation',
  approved: 'Approved',
  denied: 'Denied',
  paid: 'Paid',
}

const statusIcons: Record<string, React.ReactNode> = {
  submitted: <Clock size={20} className="text-blue-500" />,
  under_review: <RefreshCw size={20} className="text-yellow-500" />,
  pending_docs: <FileText size={20} className="text-orange-500" />,
  approved: <CheckCircle size={20} className="text-green-500" />,
  paid: <CheckCircle size={20} className="text-teal-500" />,
  denied: <XCircle size={20} className="text-red-500" />,
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function ClaimStatusPage({ params }: { params: { statusToken: string } }) {
  const [data, setData] = useState<PublicClaimData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/claim-status/${params.statusToken}`)
      if (!res.ok) { setError(true); return }
      setData(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.statusToken])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
        <XCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#1a1a2e] mb-2">Claim not found</h1>
        <p className="text-gray-600">This claim status page does not exist or the link may be incorrect.</p>
      </div>
    </div>
  )

  const humanStatus = STATUS_LABELS[data.status] ?? data.status
  const isApproved = data.status === 'approved' || data.status === 'paid'
  const netApproved = isApproved && data.amount_approved != null && data.deductible != null
    ? Math.max(0, data.amount_approved - data.deductible)
    : data.amount_approved

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#5DCAA5]/10 rounded-xl mb-4">
            <Shield size={24} className="text-[#5DCAA5]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Claim Status</h1>
          <p className="text-gray-600 mt-1">Protected by Canopy</p>
        </div>

        {/* Claim summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Claim reference</p>
              <p className="font-mono font-bold text-[#1a1a2e]">{data.claim_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusPill status={data.status} />
              <p className="text-xs text-gray-500 mt-1">{humanStatus}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Amount claimed</p>
              <p className="font-semibold text-[#1a1a2e]">${Number(data.amount_claimed).toLocaleString()}</p>
            </div>
            {isApproved && netApproved != null && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount approved</p>
                <p className="font-semibold text-green-600">${Number(netApproved).toLocaleString()}</p>
                {data.deductible != null && data.deductible > 0 && (
                  <p className="text-xs text-gray-400">(after ${Number(data.deductible).toLocaleString()} deductible)</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">Submitted</p>
              <p className="text-sm text-gray-700">{new Date(data.created_at).toLocaleDateString()}</p>
            </div>
            {data.incident_date && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Incident date</p>
                <p className="text-sm text-gray-700">{new Date(data.incident_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Review message */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
          Your claim is being reviewed by our claims team. Final coverage determinations are made by licensed claims examiners.
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Timeline</h2>
          {data.events.length === 0 ? (
            <p className="text-gray-500 text-sm">No updates yet.</p>
          ) : (
            <div className="space-y-4">
              {data.events.map((event, i) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex-shrink-0">
                      {statusIcons[event.status] || <Clock size={20} className="text-gray-400" />}
                    </div>
                    {i < data.events.length - 1 && (
                      <div className="flex-1 w-px bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusPill status={event.status} />
                      <span className="text-xs text-gray-500">{formatDate(event.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          This page refreshes automatically every 30 seconds.{' '}
          <button onClick={fetchStatus} className="text-[#5DCAA5] hover:underline">Refresh now</button>
        </p>
      </div>
    </div>
  )
}
