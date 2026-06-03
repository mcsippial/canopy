import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const orgId = membership.org_id
  const supabase = createClient()

  const { error } = await supabase
    .from('alerts')
    .update({ read: true })
    .eq('id', params.id)
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: 'Failed to mark alert as read' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
