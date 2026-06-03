'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Select } from '@/components/ui/Input'

interface AuditEntry {
  id: string
  agent_id: string | null
  action_type: string
  action_description: string | null
  occurred_at: string
  severity: string | null
  metadata: Record<string, unknown> | null
  input_hash: string | null
  output_hash: string | null
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

const actionTypePill: Record<string, string> = {
  tool_call: 'bg-blue-100 text-blue-700',
  tool_response: 'bg-indigo-100 text-indigo-700',
  policy_violation: 'bg-red-100 text-red-700',
  anomaly: 'bg-amber-100 text-amber-700',
}

const severityPill: Record<string, string> = {
  info: 'bg-gray-100 text-gray-600',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)
  const agent = Array.isArray(entry.agents) ? entry.agents[0] : entry.agents
  const meta = entry.metadata || {}
  const toolName = (meta.toolName as string) || entry.action_description?.replace('Tool: ', '').split(' —')[0] || '—'
  const callDepth = meta.callDepth as number | undefined
  const durationMs = meta.durationMs as number | undefined
  const blocked = meta.blocked as boolean | undefined
  const violationReason = meta.violationReason as string | undefined

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-xs whitespace-nowrap">
          <span title={new Date(entry.occurred_at).toLocaleString()} className="text-gray-600 cursor-help">
            {timeAgo(entry.occurred_at)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{agent?.name || <span className="text-gray-400 italic">unknown</span>}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionTypePill[entry.action_type] || 'bg-gray-100 text-gray-600'}`}>
            {entry.action_type.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600 font-mono truncate max-w-[160px]">{toolName}</td>
        <td className="px-4 py-3 text-xs text-gray-500 text-right">{callDepth ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-500 text-right">{durationMs != null ? `${durationMs}ms` : '—'}</td>
        <td className="px-4 py-3">
          {entry.severity ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityPill[entry.severity] || 'bg-gray-100 text-gray-600'}`}>
              {entry.severity}
            </span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3">
          {blocked ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">Blocked</span>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-gray-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {entry.input_hash && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Input hash</span>
                  <p className="font-mono text-xs text-gray-700 mt-1 break-all">{entry.input_hash}</p>
                </div>
              )}
              {entry.output_hash && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Output hash</span>
                  <p className="font-mono text-xs text-gray-700 mt-1 break-all">{entry.output_hash}</p>
                </div>
              )}
              {violationReason && (
                <div className="md:col-span-2">
                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Violation reason</span>
                  <p className="text-sm text-gray-700 mt-1">{violationReason}</p>
                </div>
              )}
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="md:col-span-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Metadata</span>
                  <pre className="text-xs bg-gray-100 rounded p-3 mt-1 overflow-auto max-h-48 text-gray-700">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface AgentOption {
  id: string
  name: string
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [filters, setFilters] = useState({
    agentId: '',
    actionType: '',
    severity: '',
    dateRange: '7d',
  })

  function buildQuery() {
    const params = new URLSearchParams()
    if (filters.agentId) params.set('agentId', filters.agentId)
    if (filters.actionType) params.set('actionType', filters.actionType)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.dateRange !== 'all') {
      const now = new Date()
      if (filters.dateRange === '1h') now.setHours(now.getHours() - 1)
      else if (filters.dateRange === '24h') now.setDate(now.getDate() - 1)
      else if (filters.dateRange === '7d') now.setDate(now.getDate() - 7)
      params.set('from', now.toISOString())
    }
    params.set('limit', '100')
    return params.toString()
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/audit?${buildQuery()}`)
      if (res.ok) {
        const json = await res.json()
        setEntries(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
          <ScrollText size={24} className="text-[#5DCAA5]" />
          Audit Log
        </h1>
        <p className="text-gray-600 mt-1">All agent actions and events logged by the Canopy MCP monitor.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <Select
          label="Agent"
          value={filters.agentId}
          onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
          className="w-44"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Select
          label="Action type"
          value={filters.actionType}
          onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
          className="w-44"
        >
          <option value="">All types</option>
          <option value="tool_call">Tool call</option>
          <option value="tool_response">Tool response</option>
          <option value="policy_violation">Policy violation</option>
          <option value="anomaly">Anomaly</option>
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
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </Select>
        <Select
          label="Date range"
          value={filters.dateRange}
          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          className="w-36"
        >
          <option value="1h">Last hour</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ScrollText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No audit log entries yet</h3>
          <p className="text-gray-500 mb-4">
            Install the Canopy MCP monitor to start recording agent activity.
          </p>
          <Link href="/dashboard/badge" className="text-[#5DCAA5] hover:underline text-sm font-medium">
            View API &amp; Badge setup →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Agent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tool name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Depth</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Blocked</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {entries.length} entries
          </div>
        </div>
      )}
    </div>
  )
}
