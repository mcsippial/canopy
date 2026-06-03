import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get org membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(id, name, slug, plan)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/login')
  }

  const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar org={org} userRole={membership.role} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
