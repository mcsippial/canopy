'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { Select } from '@/components/ui/Input'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Alert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  read: boolean
  action_url: string | null
  created_at: string
  agents: { name: string } | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const severityPill: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const severityBorder: Record<string, string> = {
  info: 'border-l-blue-400',
  warning: 'border-l-amber-400',
  critical: 'border-l-red-500',
}

export default function AlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ alertType: '', severity: '' })

  function buildQuery() {
    const params = new URLSearchParams()
    if (filters.alertType) params.set('alertType', filters.alertType)
    if (filters.severity) params.set('severity', filters.severity)
    params.set('limit', '100')
    return params.toString()
  }

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alerts?${buildQuery()}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  async function markRead(id: string) {
    try {
      await fetch(`/api/alerts/${id}/read`, { method: 'POST' })
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/alerts/read-all', { method: 'POST' })
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
      toast.success('All alerts marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  function handleAlertClick(alert: Alert) {
    markRead(alert.id)
    if (alert.action_url) {
      router.push(alert.action_url)
    }
  }

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <Bell size={24} className="text-[#5DCAA5]" />
            Alerts
          </h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-[#5DCAA5] hover:underline"
          >
            <CheckCircle2 size={16} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <Select
          label="Alert type"
          value={filters.alertType}
          onChange={(e) => setFilters({ ...filters, alertType: e.target.value })}
          className="w-52"
        >
          <option value="">All types</option>
          <option value="policy_violation">Policy violation</option>
          <option value="anomaly_detected">Anomaly detected</option>
          <option value="claim_submitted">Claim submitted</option>
          <option value="claim_status_changed">Claim status changed</option>
          <option value="agent_flagged">Agent flagged</option>
          <option value="policy_expiring">Policy expiring</option>
          <option value="usage_limit_approaching">Usage limit approaching</option>
          <option value="monitoring_stopped">Monitoring stopped</option>
        </Select>
        <Select
          label="Severity"
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="w-36"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Bell size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No alerts</h3>
          <p className="text-gray-500">Alerts are created automatically when events like policy violations or new claims occur.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const agent = Array.isArray(alert.agents) ? alert.agents[0] : alert.agents
            return (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`bg-white border border-gray-200 border-l-4 rounded-xl px-5 py-4 cursor-pointer hover:shadow-sm transition-shadow ${severityBorder[alert.severity] || 'border-l-gray-300'} ${!alert.read ? 'bg-blue-50/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm text-[#1a1a2e]">{alert.title}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${severityPill[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{timeAgo(alert.created_at)}</span>
                      {agent && <span>· {agent.name}</span>}
                      <span className="capitalize">· {alert.alert_type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(alert.id) }}
                      className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
