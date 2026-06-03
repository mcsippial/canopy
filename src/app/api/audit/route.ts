import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const orgId = membership.org_id
  const supabase = createClient()

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const actionType = searchParams.get('actionType')
  const severity = searchParams.get('severity')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = (page - 1) * limit

  let query = supabase
    .from('audit_log')
    .select('*, agents(name)', { count: 'exact' })
    .eq('org_id', orgId)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (agentId) query = query.eq('agent_id', agentId)
  if (actionType) query = query.eq('action_type', actionType)
  if (severity) query = query.eq('severity', severity)
  if (from) query = query.gte('occurred_at', from)
  if (to) query = query.lte('occurred_at', to)

  const { data, error, count } = await query

  if (error) {
    console.error('[audit] query error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], count: count || 0, page, limit })
}
