import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('badge_embeds')
    .select('*')
    .eq('org_id', membership.org_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

const UpdateBadgeSchema = z.object({
  active: z.boolean().optional(),
  domain_whitelist: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateBadgeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('badge_embeds')
    .update(parsed.data)
    .eq('org_id', membership.org_id)
    .select()
    .single()

  if (error) return serverErrorResponse()

  return NextResponse.json(data)
}
