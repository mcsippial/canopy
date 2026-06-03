'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CoveredUser {
  id: string
  email: string
  external_user_id?: string
  created_at: string
}

interface OrgInfo {
  covered_users_limit: number | null
  plan: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UsersPage() {
  const [users, setUsers] = useState<CoveredUser[]>([])
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ email: '', external_user_id: '' })

  async function fetchUsers() {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
      setOrgInfo(data.org || null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add user')
        return
      }
      toast.success('User added')
      setUsers([data, ...users])
      setShowModal(false)
      setForm({ email: '', external_user_id: '' })
    } catch {
      toast.error('Failed to add user')
    } finally {
      setSubmitting(false)
    }
  }

  const limit = orgInfo?.covered_users_limit
  const usagePercent = limit ? Math.min(100, (users.length / limit) * 100) : 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Covered Users</h1>
          <p className="text-gray-600 mt-1">Manage users protected by your Canopy policy.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add user
        </Button>
      </div>

      {/* Usage */}
      {limit && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Users covered</span>
            <span className="text-sm text-gray-600">{users.length.toLocaleString()} / {limit.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent > 90 ? 'bg-red-500' : 'bg-[#5DCAA5]'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent > 90 && (
            <p className="text-xs text-red-600 mt-1">Approaching limit. Consider upgrading your plan.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No covered users</h3>
          <p className="text-gray-500 mb-6">Add users to include them in your coverage policy.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add your first user
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">External User ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-[#1a1a2e]">{u.email}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.external_user_id || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Add covered user</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <Input
                label="Email"
                type="email"
                required
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="External user ID (optional)"
                placeholder="user_123"
                value={form.external_user_id}
                onChange={(e) => setForm({ ...form, external_user_id: e.target.value })}
                hint="Your internal user identifier"
              />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={submitting} className="flex-1">Add user</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
