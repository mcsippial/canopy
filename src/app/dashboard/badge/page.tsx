'use client'

import { useState, useEffect } from 'react'
import { Code2, Copy, RefreshCw, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'

const APP_URL = 'https://canopy-lyart.vercel.app'

interface BadgeData {
  id: string
  embed_key: string
  domain_whitelist: string[]
  active: boolean
  last_used_at?: string
  rotated_at?: string
}

interface PolicyData {
  id: string
  policy_number: string
  status: string
  per_incident_limit: number
  aggregate_limit: number
  expires_at?: string
}

export default function BadgePage() {
  const [badge, setBadge] = useState<BadgeData | null>(null)
  const [policy, setPolicy] = useState<PolicyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [activating, setActivating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function fetchData() {
    const [badgeRes, policyRes] = await Promise.all([
      fetch('/api/badge-config'),
      fetch('/api/policy'),
    ])
    if (badgeRes.ok) setBadge(await badgeRes.json())
    if (policyRes.ok) {
      const policyData = await policyRes.json()
      setPolicy(policyData.policy ?? null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleRotate() {
    if (!confirm('Rotating the embed key will invalidate your current badge. All existing embeds will stop working. Continue?')) return
    setRotating(true)
    try {
      const res = await fetch('/api/badge/rotate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Rotation failed'); return }
      toast.success('Embed key rotated')
      setBadge(prev => prev ? { ...prev, embed_key: data.embed_key, rotated_at: data.rotated_at } : null)
    } catch {
      toast.error('Rotation failed')
    } finally {
      setRotating(false)
    }
  }

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch('/api/badge-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !badge?.active }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.success(data.active ? 'Badge activated' : 'Badge deactivated')
      setBadge(prev => prev ? { ...prev, active: data.active } : null)
    } catch {
      toast.error('Failed')
    } finally {
      setActivating(false)
    }
  }

  function copyCode() {
    if (!badge) return
    const code = `<script src="${APP_URL}/badge.js" data-key="${badge.embed_key}"></script>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Embed code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const embedCode = badge ? `<script src="${APP_URL}/badge.js" data-key="${badge.embed_key}"></script>` : ''

  const hasActivePolicy = !!policy
  const badgeIsActive = badge?.active

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">API &amp; Badge</h1>
        <p className="text-gray-600 mt-1">Configure your trust badge and embed it in your product.</p>
      </div>

      {/* Coverage status indicator */}
      {badge && (
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${
          hasActivePolicy && badgeIsActive
            ? 'bg-green-50 border-green-200'
            : !hasActivePolicy
            ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-100 border-gray-200'
        }`}>
          {hasActivePolicy && badgeIsActive ? (
            <>
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-green-800">Coverage Active</div>
                <div className="text-sm text-green-700">
                  Policy {policy.policy_number} — your badge reflects live coverage
                </div>
              </div>
            </>
          ) : !hasActivePolicy ? (
            <>
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-800">No active policy</div>
                <div className="text-sm text-amber-700">
                  Generate a policy to activate your badge and display real coverage to users.
                </div>
              </div>
            </>
          ) : (
            <>
              <XCircle size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-700">Badge inactive</div>
                <div className="text-sm text-gray-600">
                  Activate your badge below to display coverage to users.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {badge ? (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1a1a2e]">Badge status</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${badge.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600">{badge.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <Button variant={badge.active ? 'outline' : 'primary'} onClick={handleActivate} loading={activating}>
              {badge.active ? 'Deactivate badge' : 'Activate badge'}
            </Button>
          </div>

          {/* Embed key */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-[#1a1a2e] mb-4">Embed key</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-700 truncate">
                {badge.embed_key}
              </div>
              <Button variant="outline" onClick={handleRotate} loading={rotating}>
                <RefreshCw size={14} /> Rotate
              </Button>
            </div>
            {badge.rotated_at && (
              <p className="text-xs text-gray-500">Last rotated: {new Date(badge.rotated_at).toLocaleDateString()}</p>
            )}
          </div>

          {/* Embed code */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1a1a2e]">Embed code</h2>
              <Button variant="outline" size="sm" onClick={copyCode}>
                {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-[#1a1a2e] text-[#5DCAA5] text-sm rounded-lg p-4 overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <p className="text-xs text-gray-500 mt-3">
              Add this script tag to the pages where your AI agent operates. The badge will appear automatically.
            </p>
          </div>

          {/* Badge preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-[#1a1a2e] mb-4">Badge preview</h2>
            <div className="space-y-4">
              {/* Active state */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Active coverage</p>
                <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
                  <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-md cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="bg-[#5DCAA5]/20 p-1.5 rounded-lg">
                      <Shield size={18} className="text-[#5DCAA5]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1a1a2e]">Protected by Canopy</div>
                      <div className="text-[10px] text-gray-500">
                        Up to {hasActivePolicy ? `$${(policy.per_incident_limit / 1000).toFixed(0)}K` : '$50K'} per incident
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending state */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Pending coverage (shown when no active policy)</p>
                <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm cursor-pointer opacity-75">
                    <div className="bg-gray-100 p-1.5 rounded-lg">
                      <Shield size={16} className="text-gray-400" />
                    </div>
                    <div className="text-xs font-semibold text-gray-500">Coverage Pending</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              When active, users can click to view coverage details and submit claims.
            </p>
          </div>

          {/* Verification links */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-[#1a1a2e] mb-4">Public pages</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Badge verification page</div>
                  <div className="text-xs text-gray-500">Public coverage details for your users</div>
                </div>
                <a
                  href={`/verify/${badge.embed_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#5DCAA5] hover:underline"
                >
                  Open →
                </a>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Claim submission page</div>
                  <div className="text-xs text-gray-500">Where users submit claims</div>
                </div>
                <a
                  href={`/claim/${badge.embed_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#5DCAA5] hover:underline"
                >
                  Open →
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Code2 size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No badge configured. Contact support.</p>
        </div>
      )}
    </div>
  )
}
