'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

function generateEmbedKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'emb_'
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)]
  return key
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Step 1: Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      })
      if (authError || !authData.user) {
        toast.error(authError?.message || 'Signup failed')
        return
      }

      // Step 2: Sign in immediately to establish session (needed for RLS)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInError) {
        toast.error('Account created but sign-in failed. Please log in manually.')
        router.push('/login')
        return
      }

      // Step 3: Create organization
      const slug = slugify(form.companyName) + '-' + Date.now()
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: form.companyName, slug, plan: 'none' })
        .select()
        .single()
      if (orgError || !org) {
        toast.error('Failed to create organization: ' + (orgError?.message ?? 'unknown error'))
        return
      }

      // Step 4: Create membership
      const { error: memberError } = await supabase.from('organization_members').insert({
        org_id: org.id,
        user_id: authData.user.id,
        role: 'owner',
      })
      if (memberError) {
        toast.error('Failed to create membership: ' + memberError.message)
        return
      }

      // Step 5: Create badge embed
      await supabase.from('badge_embeds').insert({
        org_id: org.id,
        embed_key: generateEmbedKey(),
        active: false,
      })

      toast.success('Account created! Redirecting...')
      router.push('/dashboard')
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
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Create your account</h1>
              <p className="text-gray-600 text-sm">Get started with Canopy coverage for your AI agents.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Company name"
                type="text"
                required
                placeholder="Acme Corp"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
              <Input
                label="Full name"
                type="text"
                required
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <Input
                label="Work email"
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
                placeholder="At least 8 characters"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Create account
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-[#5DCAA5] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            By creating an account, you agree to our{' '}
            <a href="#" className="underline">Terms of Service</a> and{' '}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
