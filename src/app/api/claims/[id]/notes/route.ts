import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'

const NoteSchema = z.object({
  note: z.string().min(1).max(5000),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const supabase = createClient()
  const orgId = membership.org_id

  // Verify claim belongs to org
  const { data: claim } = await supabase
    .from('claims')
    .select('id')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .single()

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('claim_notes')
    .select('id, note, created_at, user_id')
    .eq('claim_id', params.id)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) return serverErrorResponse()

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = NoteSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createClient()
  const orgId = membership.org_id

  // Verify claim belongs to org
  const { data: claim } = await supabase
    .from('claims')
    .select('id')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .single()

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('claim_notes')
    .insert({
      claim_id: params.id,
      org_id: orgId,
      user_id: user.id,
      note: parsed.data.note,
    })
    .select()
    .single()

  if (error) return serverErrorResponse()

  return NextResponse.json(data, { status: 201 })
}
