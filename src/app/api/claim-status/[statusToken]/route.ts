import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: { statusToken: string } }) {
  const supabase = createAdminClient()

  const { data: claim, error } = await supabase
    .from('claims')
    .select('claim_number, status, amount_claimed, amount_approved, incident_date, created_at, claim_status_events(*)')
    .eq('public_status_token', params.statusToken)
    .single()

  if (error || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  // Return only public information — no AI reasoning, no internal flags
  const events = (Array.isArray(claim.claim_status_events) ? claim.claim_status_events : [])
    .filter((e: { public: boolean }) => e.public)
    .sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((e: { id: string; status: string; message: string; created_at: string }) => ({
      id: e.id,
      status: e.status,
      message: e.message,
      created_at: e.created_at,
    }))

  return NextResponse.json({
    claim_number: claim.claim_number,
    status: claim.status,
    amount_claimed: claim.amount_claimed,
    amount_approved: claim.amount_approved,
    incident_date: claim.incident_date,
    created_at: claim.created_at,
    events,
  })
}
