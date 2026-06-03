'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-6">
        <Logo />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Welcome back</h1>
              <p className="text-gray-600 text-sm">Sign in to your Canopy dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                required
                placeholder="jane@acme.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Password"
                type="password"
                required
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#5DCAA5] font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
