import { Shield, CheckCircle, XCircle, FileText } from 'lucide-react'
import Link from 'next/link'

interface VerifyData {
  verified: boolean
  org_name?: string
  plan?: string
  coverage_limit?: number
  per_incident_limit?: number
  covered_events?: string[]
  exclusions?: string[]
}

async function getVerifyData(embedKey: string): Promise<VerifyData> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${appUrl}/api/badge/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embed_key: embedKey }),
      cache: 'no-store',
    })
    if (!res.ok) return { verified: false }
    return res.json()
  } catch {
    return { verified: false }
  }
}

export default async function VerifyPage({ params }: { params: { embedKey: string } }) {
  const data = await getVerifyData(params.embedKey)

  if (!data.verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Badge not found</h1>
          <p className="text-gray-600">This badge is not active or does not exist.</p>
          <Link href="/" className="mt-6 block text-[#5DCAA5] hover:underline">Learn about Canopy</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5DCAA5]/10 rounded-2xl mb-4">
            <Shield size={32} className="text-[#5DCAA5]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Protected by Canopy</h1>
          <p className="text-gray-600">{data.org_name} has enrolled in Canopy coverage to protect users like you.</p>
        </div>

        {/* Coverage details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Coverage details</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#5DCAA5]/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Coverage limit</p>
              <p className="text-2xl font-bold text-[#1a1a2e]">
                {data.coverage_limit ? `$${(data.coverage_limit / 1000000).toFixed(1)}M` : 'N/A'}
              </p>
            </div>
            <div className="bg-[#5DCAA5]/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Per incident</p>
              <p className="text-2xl font-bold text-[#1a1a2e]">
                {data.per_incident_limit ? `$${(data.per_incident_limit / 1000).toFixed(0)}K` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* What's covered */}
        {data.covered_events && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-[#1a1a2e] mb-4">What&apos;s covered</h2>
            <ul className="space-y-3">
              {data.covered_events.map((event, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-[#5DCAA5] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{event}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exclusions */}
        {data.exclusions && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-[#1a1a2e] mb-4">Exclusions</h2>
            <ul className="space-y-3">
              {data.exclusions.map((excl, i) => (
                <li key={i} className="flex items-start gap-3">
                  <XCircle size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{excl}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href={`/claim/${params.embedKey}`}
            className="flex items-center justify-center gap-2 w-full bg-[#5DCAA5] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#4ab894] transition-colors"
          >
            <FileText size={18} /> Submit a claim
          </Link>
          <p className="text-xs text-gray-500">
            Coverage provided through Canopy.{' '}
            <a href="/" className="text-[#5DCAA5] hover:underline">Learn more</a>
          </p>
        </div>
      </div>
    </div>
  )
}
