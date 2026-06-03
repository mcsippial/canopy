import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'

const UpdateStatusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'pending_docs', 'approved', 'denied', 'paid']),
  message: z.string().min(1).max(1000),
  amount_approved: z.number().positive().optional(),
  public: z.boolean().default(true),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateStatusSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createClient()

  // Verify claim belongs to org
  const { data: claim, error: fetchError } = await supabase
    .from('claims')
    .select('id')
    .eq('id', params.id)
    .eq('org_id', membership.org_id)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  }

  if (['approved', 'paid'].includes(parsed.data.status)) {
    updateData.resolved_at = new Date().toISOString()
    if (parsed.data.amount_approved !== undefined) {
      updateData.amount_approved = parsed.data.amount_approved
    }
  } else if (parsed.data.status === 'denied') {
    updateData.resolved_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('claims')
    .update(updateData)
    .eq('id', params.id)

  if (updateError) return serverErrorResponse()

  // Create status event
  await supabase.from('claim_status_events').insert({
    claim_id: params.id,
    status: parsed.data.status,
    message: parsed.data.message,
    public: parsed.data.public,
  })

  return NextResponse.json({ success: true })
}
