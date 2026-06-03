import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse } from '@/lib/auth'
import { scoreAgentRisk } from '@/lib/ai'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  // Verify agent belongs to org
  const { data: agent, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', membership.org_id)
    .single()

  if (fetchError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const { result, error: aiError } = await scoreAgentRisk(agent)

  if (aiError || !result) {
    return NextResponse.json({ error: aiError || 'AI scoring failed' }, { status: 500 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('agents')
    .update({
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      risk_assessment: result as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) return serverErrorResponse()

  return NextResponse.json(updated)
}
