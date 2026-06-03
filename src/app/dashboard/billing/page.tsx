'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/StatusPill'
import { PLAN_LIMITS } from '@/types'

interface OrgBilling {
  plan: string
  stripe_customer_id?: string
  coverage_limit?: number
  covered_users_limit?: number
}

interface Policy {
  plan: string
  status: string
  premium_monthly?: number
  effective_at?: string
  renews_at?: string
}

export default function BillingPage() {
  const [org, setOrg] = useState<OrgBilling | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => {
      setOrg(d.org)
      setPolicy(d.policy)
      setLoading(false)
    })
  }, [])

  async function handleCheckout(plan: 'starter' | 'growth') {
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Checkout failed')
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast.error('Checkout failed')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to open portal')
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast.error('Failed to open portal')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const currentPlan = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[currentPlan]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Billing</h1>
        <p className="text-gray-600 mt-1">Manage your Canopy subscription and coverage.</p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1a1a2e]">Current plan</h2>
          <StatusPill status={org?.plan || 'none'} />
        </div>
        {policy ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Monthly cost</p>
              <p className="text-lg font-bold text-[#1a1a2e]">
                {policy.premium_monthly ? `$${policy.premium_monthly.toLocaleString()}` : 'Custom'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusPill status={policy.status} />
            </div>
            {policy.effective_at && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Effective</p>
                <p className="text-sm text-gray-700">{new Date(policy.effective_at).toLocaleDateString()}</p>
              </div>
            )}
            {policy.renews_at && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Next renewal</p>
                <p className="text-sm text-gray-700">{new Date(policy.renews_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-4">No active policy. Choose a plan to get started.</p>
        )}

        {org?.stripe_customer_id && (
          <Button variant="outline" onClick={handlePortal} loading={portalLoading}>
            <ExternalLink size={14} /> Manage billing in Stripe
          </Button>
        )}
      </div>

      {/* Usage */}
      {org && org.plan !== 'none' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Plan limits</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Coverage limit', value: org.coverage_limit ? `$${(org.coverage_limit / 1000000).toFixed(1)}M` : '—' },
              { label: 'Max agents', value: limits.agents === Infinity ? 'Unlimited' : limits.agents },
              { label: 'Max users', value: org.covered_users_limit ? org.covered_users_limit.toLocaleString() : 'Unlimited' },
              { label: 'Per incident', value: limits.per_incident ? `$${(limits.per_incident / 1000).toFixed(0)}K` : '—' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-[#1a1a2e]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan options */}
      {org?.plan !== 'enterprise' && (
        <div className="grid md:grid-cols-2 gap-6">
          {(['starter', 'growth'] as const).map((plan) => {
            const planLimits = PLAN_LIMITS[plan]
            const isCurrent = org?.plan === plan
            return (
              <div key={plan} className={`bg-white rounded-xl border-2 p-6 ${isCurrent ? 'border-[#5DCAA5]' : 'border-gray-200'}`}>
                {isCurrent && (
                  <div className="text-xs text-[#5DCAA5] font-semibold mb-2 uppercase tracking-wide">Current plan</div>
                )}
                <h3 className="text-xl font-bold text-[#1a1a2e] capitalize mb-1">{plan}</h3>
                <div className="text-3xl font-bold text-[#1a1a2e] mb-4">
                  ${planLimits.monthly}<span className="text-base font-normal text-gray-500">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {[
                    `${planLimits.agents} AI agents`,
                    `$${(planLimits.coverage / 1000000).toFixed(1)}M coverage limit`,
                    `${planLimits.users.toLocaleString()} covered users`,
                    'Trust badge embed',
                    'AI claims triage',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-[#5DCAA5]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleCheckout(plan)}
                  loading={checkoutLoading === plan}
                  variant={isCurrent ? 'outline' : 'primary'}
                  className="w-full"
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current plan' : `Upgrade to ${plan}`}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
