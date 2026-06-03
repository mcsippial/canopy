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
    .from('organizations')
    .select('name, slug, plan')
    .eq('id', membership.org_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', membership.org_id)

  if (error) return serverErrorResponse()

  return NextResponse.json({ success: true })
}
