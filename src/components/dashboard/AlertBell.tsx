'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Alert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  read: boolean
  action_url: string | null
  created_at: string
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

const severityColor: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const severityDot: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
}

export function AlertBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function loadAlerts() {
    try {
      const res = await fetch('/api/alerts?unreadOnly=false&limit=5')
      if (res.ok) {
        const data = await res.json()
        setAlerts(Array.isArray(data) ? data.slice(0, 5) : [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unreadCount = alerts.filter((a) => !a.read).length

  async function markAllRead() {
    try {
      await fetch('/api/alerts/read-all', { method: 'POST' })
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
      toast.success('All alerts marked as read')
    } catch {
      toast.error('Failed to mark alerts as read')
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/alerts/${id}/read`, { method: 'POST' })
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Alerts"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-[#1a1a2e]">Alerts</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#5DCAA5] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No alerts yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!alert.read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => markRead(alert.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!alert.read ? severityDot[alert.severity] : 'bg-gray-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a2e] truncate">{alert.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${severityColor[alert.severity]}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(alert.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100">
            <Link
              href="/dashboard/alerts"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-[#5DCAA5] hover:underline py-1"
            >
              View all alerts →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
