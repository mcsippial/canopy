'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  Code2,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
  Activity,
  ScrollText,
  Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AlertBell } from './AlertBell'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/usage', label: 'Usage', icon: Activity },
  { href: '/dashboard/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/dashboard/users', label: 'Covered Users', icon: Users },
  { href: '/dashboard/policy', label: 'Policy', icon: Shield },
  { href: '/dashboard/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/badge', label: 'API & Badge', icon: Code2 },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface Props {
  org: { id: string; name: string; slug: string; plan: string } | null
  userRole: string
}

export function DashboardSidebar({ org, userRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-[#1a1a2e] flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-[#5DCAA5]/20 p-1.5 rounded-lg">
              <Shield size={20} className="text-[#5DCAA5]" />
            </div>
            <span className="text-white font-bold text-lg">Canopy</span>
          </Link>
          <AlertBell />
        </div>
        {org && (
          <div className="mt-3">
            <p className="text-white/90 text-sm font-medium truncate">{org.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#5DCAA5]/20 text-[#5DCAA5] capitalize mt-1">
              {org.plan === 'none' ? 'No Plan' : org.plan}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? 'bg-[#5DCAA5]/20 text-[#5DCAA5]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/40 mb-3 capitalize">Role: {userRole}</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
