'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface OrgSettings {
  name: string
  slug: string
  plan: string
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '' })

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setOrg(d)
      setForm({ name: d.name || '' })
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Save failed')
        return
      }
      toast.success('Settings saved')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your organization settings.</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Organization</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Organization name"
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              required
            />
            <Input
              label="Slug"
              value={org?.slug || ''}
              disabled
              hint="Organization slug cannot be changed."
            />
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
