'use client'

import { useState, useEffect } from 'react'
import { Shield, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

interface BadgeInfo {
  org_name: string
  per_incident_limit: number
}

type Step = 1 | 2 | 3 | 4

export default function ClaimPage({ params }: { params: { embedKey: string } }) {
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null)
  const [badgeError, setBadgeError] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ claim_number: string; public_status_token: string } | null>(null)

  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    incident_date: '',
    description: '',
    // Step 2 new fields
    error_started_at: '',
    error_detected_at: '',
    actions_during_incident: '',
    // Step 3 fields
    financial_impact_description: '',
    amount_claimed: '',
    error_repeated: false,
    model_at_time_of_incident: '',
  })

  useEffect(() => {
    fetch(`/api/badge/${params.embedKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setBadgeInfo(d)
        else setBadgeError(true)
      })
      .catch(() => setBadgeError(true))
  }, [params.embedKey])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        embed_key: params.embedKey,
        claimant_name: form.claimant_name,
        claimant_email: form.claimant_email,
        incident_date: form.incident_date || undefined,
        description: form.description,
        financial_impact_description: form.financial_impact_description || undefined,
        amount_claimed: parseFloat(form.amount_claimed),
        error_started_at: form.error_started_at || undefined,
        error_detected_at: form.error_detected_at || undefined,
        error_repeated: form.error_repeated,
        model_at_time_of_incident: form.model_at_time_of_incident || undefined,
      }
      if (form.actions_during_incident) {
        payload.actions_during_incident = parseInt(form.actions_during_incident)
      }

      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Submission failed. Please try again.')
        return
      }
      setResult(data)
      setStep(4)
    } catch {
      alert('Submission failed. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (badgeError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#1a1a2e] mb-2">Invalid claim link</h1>
          <p className="text-gray-600">This claim link is not active. Please contact the company you&apos;re submitting a claim against.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#5DCAA5]/10 px-4 py-2 rounded-full mb-4">
            <Shield size={16} className="text-[#5DCAA5]" />
            <span className="text-sm text-[#5DCAA5] font-medium">Protected by Canopy</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Submit a claim</h1>
          {badgeInfo && <p className="text-gray-600 mt-1">Against {badgeInfo.org_name}</p>}
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  step >= s ? 'bg-[#5DCAA5] text-white' : 'bg-gray-200 text-gray-500'
                }`}>{s}</div>
                {s < 3 && <div className={`flex-1 h-1 rounded ${step > s ? 'bg-[#5DCAA5]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {/* Step 1: Claimant info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Your information</h2>
              <Input
                label="Full name"
                required
                value={form.claimant_name}
                onChange={(e) => setForm({ ...form, claimant_name: e.target.value })}
                placeholder="Jane Smith"
              />
              <Input
                label="Email address"
                type="email"
                required
                value={form.claimant_email}
                onChange={(e) => setForm({ ...form, claimant_email: e.target.value })}
                placeholder="jane@example.com"
                hint="We'll send your claim confirmation and status updates here."
              />
              <Input
                label="Date of incident"
                type="date"
                value={form.incident_date}
                onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!form.claimant_name || !form.claimant_email}
              >
                Continue <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 2: What happened */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">What happened?</h2>
              <Textarea
                label="Describe what happened"
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Please describe the incident in as much detail as possible, including what the AI agent did or failed to do..."
                hint="Be as specific as possible. Include dates, actions taken, and any other relevant details."
              />

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Error timeline (optional but helps us assess your claim faster)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="When did the error start?"
                    type="datetime-local"
                    value={form.error_started_at}
                    onChange={(e) => setForm({ ...form, error_started_at: e.target.value })}
                  />
                  <Input
                    label="When was it detected?"
                    type="datetime-local"
                    value={form.error_detected_at}
                    onChange={(e) => setForm({ ...form, error_detected_at: e.target.value })}
                    hint="Defaults to incident date if not provided"
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label="Approx. agent actions during this period"
                    type="number"
                    min="0"
                    placeholder="e.g., 50"
                    value={form.actions_during_incident}
                    onChange={(e) => setForm({ ...form, actions_during_incident: e.target.value })}
                    hint="How many times did the agent act during the error window? (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={form.description.length < 10}
                >
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Financial impact */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Financial impact</h2>
              {badgeInfo && (
                <div className="bg-[#5DCAA5]/5 rounded-lg p-3 text-sm text-gray-600">
                  Coverage up to <strong>${(badgeInfo.per_incident_limit / 1000).toFixed(0)}K</strong> per incident.
                </div>
              )}
              <Input
                label="Amount claimed ($)"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.amount_claimed}
                onChange={(e) => setForm({ ...form, amount_claimed: e.target.value })}
                placeholder="0.00"
              />
              <Textarea
                label="Explain the financial impact"
                rows={3}
                value={form.financial_impact_description}
                onChange={(e) => setForm({ ...form, financial_impact_description: e.target.value })}
                placeholder="How did this incident affect you financially? Include any costs, losses, or damages..."
              />

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Additional details</p>

                {/* Was this error repeated? */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Was this error repeated or looped?</div>
                    <div className="text-xs text-gray-500">Did the agent repeat the same mistake multiple times?</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, error_repeated: true })}
                      className={`px-3 py-1 text-sm rounded-lg border font-medium transition-colors ${form.error_repeated ? 'bg-[#5DCAA5] text-white border-[#5DCAA5]' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, error_repeated: false })}
                      className={`px-3 py-1 text-sm rounded-lg border font-medium transition-colors ${!form.error_repeated ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <Input
                  label="AI model version at time of incident"
                  placeholder="e.g., gpt-4o, claude-sonnet-4-20250514"
                  value={form.model_at_time_of_incident}
                  onChange={(e) => setForm({ ...form, model_at_time_of_incident: e.target.value })}
                  hint="Which AI model was the agent using when the error occurred? (optional)"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  By submitting, you confirm that the information provided is accurate and complete to the best of your knowledge.
                  False claims may result in denial and possible legal action.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!form.amount_claimed || parseFloat(form.amount_claimed) <= 0}
                >
                  Submit claim
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && result && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Claim submitted</h2>
              <p className="text-gray-600 mb-4">
                Your claim <strong>{result.claim_number}</strong> has been received.
                We&apos;ve sent a confirmation email with your status link.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 mb-1">Claim reference</p>
                <p className="font-mono font-bold text-[#1a1a2e]">{result.claim_number}</p>
              </div>
              <div className="space-y-3">
                <Link
                  href={`/claim/status/${result.public_status_token}`}
                  className="block w-full bg-[#5DCAA5] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#4ab894] transition-colors"
                >
                  Track claim status
                </Link>
                <p className="text-xs text-gray-500">
                  You&apos;ll receive email updates as your claim progresses.
                </p>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-center text-xs text-gray-500 mt-4">
            Claim processed by <a href="/" className="text-[#5DCAA5] hover:underline">Canopy</a>
          </p>
        )}
      </div>
    </div>
  )
}
