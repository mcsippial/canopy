import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { agentId: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  // Verify agent belongs to org
  const { data: agent } = await supabase
    .from('agents')
    .select('id, current_underwriting_id')
    .eq('id', params.agentId)
    .eq('org_id', membership.org_id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.current_underwriting_id) {
    return NextResponse.json({ underwriting: null })
  }

  const { data: decision, error } = await supabase
    .from('underwriting_decisions')
    .select('*')
    .eq('id', agent.current_underwriting_id)
    .single()

  if (error) {
    return NextResponse.json({ underwriting: null })
  }

  return NextResponse.json({ underwriting: decision })
}
