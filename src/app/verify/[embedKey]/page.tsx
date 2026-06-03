import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

interface PublicBadgeData {
  active: boolean
  coverage_status: 'active' | 'inactive' | 'pending'
  org_display_name?: string
  per_incident_limit?: number | null
  aggregate_limit?: number | null
  policy_number_masked?: string | null
  covered_event_summary?: string[]
  policy_expires_at?: string | null
  embed_key?: string
  verify_url?: string
  claim_url?: string
}

async function getBadgeData(embedKey: string): Promise<PublicBadgeData> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${appUrl}/api/badge/${encodeURIComponent(embedKey)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return { active: false, coverage_status: 'inactive' }
    return res.json()
  } catch {
    return { active: false, coverage_status: 'inactive' }
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return 'N/A'
  return '$' + amount.toLocaleString('en-US')
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'N/A'
  return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function VerifyPage({ params }: { params: { embedKey: string } }) {
  const data = await getBadgeData(params.embedKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://canopy-lyart.vercel.app'

  const isActive = data.coverage_status === 'active'
  const isPending = data.coverage_status === 'pending'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1a1a2e] rounded-2xl mb-5 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#5DCAA5" opacity="0.9"/>
              <path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#1a1a2e"/>
              <path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#5DCAA5" opacity="0.6"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">This service is Protected by Canopy</h1>
          {data.org_display_name && (
            <p className="text-lg text-gray-600 font-medium">{data.org_display_name}</p>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

          {/* Coverage status badge */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-500">Coverage Status</span>
            {isActive && (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-sm font-semibold">
                <CheckCircle size={14} />
                Active
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-sm font-semibold">
                <Clock size={14} />
                Pending
              </span>
            )}
            {!isActive && !isPending && (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-3 py-1 text-sm font-semibold">
                <AlertCircle size={14} />
                Inactive
              </span>
            )}
          </div>

          {isActive ? (
            <>
              {/* Policy details */}
              <div className="space-y-3 mb-6">
                {data.policy_number_masked && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Policy Number</span>
                    <span className="text-sm font-mono font-semibold text-[#1a1a2e]">{data.policy_number_masked}</span>
                  </div>
                )}
                {data.policy_expires_at && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Policy Expires</span>
                    <span className="text-sm font-semibold text-[#1a1a2e]">{formatDate(data.policy_expires_at)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Per-Incident Limit</span>
                  <span className="text-sm font-bold text-[#1a1a2e]">{formatCurrency(data.per_incident_limit)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Aggregate Limit</span>
                  <span className="text-sm font-bold text-[#1a1a2e]">{formatCurrency(data.aggregate_limit)}</span>
                </div>
              </div>

              {/* Covered events */}
              {data.covered_event_summary && data.covered_event_summary.length > 0 && (
                <div className="bg-[#5DCAA5]/5 rounded-xl p-4 mb-6">
                  <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">What&apos;s covered</h2>
                  <ul className="space-y-2">
                    {data.covered_event_summary.map((event, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={15} className="text-[#5DCAA5] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{event}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Claim button */}
              <Link
                href={data.claim_url || `/claim/${params.embedKey}`}
                className="flex items-center justify-center gap-2 w-full bg-[#5DCAA5] hover:bg-[#4ab894] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <FileText size={18} />
                File a Claim
              </Link>

              <p className="text-xs text-gray-400 text-center mt-4">
                This coverage is administered by Canopy Coverage Services, Inc. on behalf of admitted carriers.
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Coverage for this service is not currently active.</p>
              {isPending && (
                <p className="text-sm text-gray-400 mt-2">This service has applied for Canopy coverage. Check back soon.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center">
          Verify the authenticity of this page at{' '}
          <a href={`${appUrl}/verify/${params.embedKey}`} className="text-[#5DCAA5] hover:underline">
            canopy.insure/verify/{params.embedKey}
          </a>
        </p>
      </div>
    </div>
  )
}
