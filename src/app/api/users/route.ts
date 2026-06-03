import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'

const AddUserSchema = z.object({
  email: z.string().email(),
  external_user_id: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin', 'member'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = AddUserSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createClient()

  const { data, error } = await supabase
    .from('covered_users')
    .insert({
      org_id: membership.org_id,
      email: parsed.data.email,
      external_user_id: parsed.data.external_user_id || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User already added' }, { status: 409 })
    }
    return serverErrorResponse()
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()

  const [usersRes, orgRes] = await Promise.all([
    supabase.from('covered_users').select('*').eq('org_id', membership.org_id).order('created_at', { ascending: false }),
    supabase.from('organizations').select('covered_users_limit, plan').eq('id', membership.org_id).single(),
  ])

  return NextResponse.json({
    users: usersRes.data || [],
    org: orgRes.data || null,
  })
}
