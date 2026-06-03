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

function SectionDivider() {
  return <hr className="border-t border-gray-200 my-8" />
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-base font-bold text-[#1a1a2e] uppercase tracking-wide mb-4">
      {number}. {title}
    </h2>
  )
}

function PolicyView({ policy }: { policy: PolicyRecord }) {
  const doc = policy.document
  return (
    <div className="bg-white rounded-xl border border-gray-200 print:border-0 print:shadow-none print:rounded-none">
      {/* Document Header */}
      <div className="p-8 border-b border-gray-200 print:pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5DCAA5]/10 p-3 rounded-xl print:hidden">
              <Shield size={28} className="text-[#5DCAA5]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">AI Agent Liability Policy</p>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">Canopy Coverage Services, Inc.</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Specialty AI Liability Program<br />
                <span className="text-xs">Administered on behalf of admitted carriers. Coverage subject to carrier approval and state availability.</span>
              </p>
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
      </div>

      <div className="p-8 space-y-0">

        {/* DECLARATIONS PAGE */}
        <section>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-2">
            <h2 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-widest mb-5 text-center">Declarations Page</h2>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Named Insured</div>
                <div className="font-semibold text-[#1a1a2e]">{doc.insured_organization.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Policy Number</div>
                <div className="font-mono font-semibold text-[#1a1a2e]">{doc.policy_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Policy Period</div>
                <div className="font-semibold text-[#1a1a2e]">{formatDate(doc.effective_at)} to {formatDate(doc.expires_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Coverage Territory</div>
                <div className="font-semibold text-[#1a1a2e]">{doc.coverage_territory}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Aggregate Limit</div>
                <div className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(doc.aggregate_limit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Per Incident Limit</div>
                <div className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(doc.per_incident_limit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Monthly Premium</div>
                <div className="text-xl font-bold text-[#1a1a2e]">
                  {doc.premium_monthly === 0 ? 'Custom — see endorsement' : formatCurrency(doc.premium_monthly)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Endorsements</div>
                <div className="font-semibold text-[#1a1a2e]">Schedule of Covered Agents</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
              <span className="font-medium">Date of Issue:</span> {formatDate(doc.issued_at)}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span className="font-medium">Issuer:</span> Canopy Coverage Services, Inc.
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span className="font-medium">Insured ID:</span> {doc.insured_organization.id}
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* I. INSURING AGREEMENT */}
        <section>
          <SectionHeading number="I" title="Insuring Agreement" />
          <p className="text-sm text-gray-700 leading-relaxed">
            In consideration of the premium paid and subject to the terms, conditions, exclusions, and limitations of this policy,
            Canopy Coverage Services, Inc. (&ldquo;Canopy&rdquo;) agrees to indemnify the Named Insured against covered losses arising from
            the operation of AI agents individually listed and approved under the Schedule of Covered Agents (Endorsement A),
            occurring during the Policy Period and within the Coverage Territory, up to the applicable limits of liability set
            forth in the Declarations Page. This policy constitutes a contract of indemnity only. Canopy&apos;s obligation to pay
            under this policy arises solely upon the Insured sustaining or becoming legally obligated to pay a covered loss as
            defined herein.
          </p>
        </section>

        <SectionDivider />

        {/* II. COVERED EVENTS */}
        <section>
          <SectionHeading number="II" title="Covered Events" />
          <p className="text-xs text-gray-500 mb-4 italic">
            Subject to the terms, conditions, exclusions, and limits of this policy, the following losses are covered:
          </p>
          <ul className="space-y-3">
            {doc.covered_events.map((event, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{event}</span>
              </li>
            ))}
          </ul>
        </section>

        <SectionDivider />

        {/* III. EXCLUSIONS */}
        <section>
          <SectionHeading number="III" title="Exclusions" />
          <p className="text-xs text-gray-500 mb-4 italic">
            This policy does not apply to, and Canopy shall have no obligation to pay for, any loss, damage, cost, or expense
            arising directly or indirectly out of, or in any way involving:
          </p>
          <ul className="space-y-3">
            {doc.exclusions.map((ex, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{ex}</span>
              </li>
            ))}
          </ul>
        </section>

        <SectionDivider />

        {/* IV. CONDITIONS */}
        <section>
          <SectionHeading number="IV" title="Conditions" />
          <ol className="space-y-4">
            {doc.conditions.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                <span className="text-sm text-gray-700 leading-relaxed">{c}</span>
              </li>
            ))}
          </ol>
        </section>

        <SectionDivider />

        {/* V. CLAIMS PROCEDURE */}
        <section>
          <SectionHeading number="V" title="Claims Procedure" />
          <ol className="space-y-4">
            {doc.claims_process.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5DCAA5]/10 text-[#5DCAA5] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed mt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <SectionDivider />

        {/* VI. GENERAL PROVISIONS */}
        <section>
          <SectionHeading number="VI" title="General Provisions" />
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold">Governing Law.</span> {doc.governing_law}
          </p>
        </section>

        <SectionDivider />

        {/* ENDORSEMENT A — SCHEDULE OF COVERED AGENTS */}
        <section>
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Endorsement A</p>
            <h2 className="text-base font-bold text-[#1a1a2e] uppercase tracking-wide">Schedule of Covered Agents</h2>
            <p className="text-xs text-gray-500 mt-1">
              Coverage under this policy applies only to agents individually identified below. Any AI agent not listed in this
              schedule is not a covered agent and is expressly excluded from coverage.
            </p>
          </div>
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

        <SectionDivider />

        {/* Footer */}
        <div className="text-xs text-gray-400 space-y-2 pt-2">
          <p className="font-medium text-gray-600 text-sm">
            This document constitutes the entire agreement between the parties with respect to the subject matter hereof.
            No modification of this policy shall be valid unless made in writing and signed by an authorized representative
            of Canopy Coverage Services, Inc.
          </p>
          <p>Issued: {formatDate(doc.issued_at)} &nbsp;|&nbsp; Policy Number: {doc.policy_number}</p>
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

  const policyNumber = policy?.document?.policy_number
  const pageTitle = policyNumber ? `Policy ${policyNumber} | Canopy` : 'Policy | Canopy'

  return (
    <>
      <title>{pageTitle}</title>
      <div className="p-8 print:p-0">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Policy</h1>
            <p className="text-gray-600 mt-1">Your AI agent liability coverage document.</p>
          </div>
          <div className="flex gap-3">
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

      <style>{`
        @media print {
          [data-sidebar], nav, aside, header, .print\\:hidden { display: none !important; }
          body { background: white; }
          @page { margin: 1.5cm 2cm; }
        }
      `}</style>
    </>
  )
}
