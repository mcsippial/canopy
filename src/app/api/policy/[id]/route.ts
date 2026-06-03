import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  const { data: policy, error } = await supabase
    .from('policy_documents')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', membership.org_id)
    .single()

  if (error || !policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }

  return NextResponse.json({ policy })
}
