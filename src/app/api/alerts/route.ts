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
  const alertType = searchParams.get('alertType')
  const severity = searchParams.get('severity')
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  let query = supabase
    .from('alerts')
    .select('*, agents(name)')
    .eq('org_id', orgId)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (alertType) query = query.eq('alert_type', alertType)
  if (severity) query = query.eq('severity', severity)
  if (unreadOnly) query = query.eq('read', false)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
