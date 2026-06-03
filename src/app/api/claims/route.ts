import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth'
import { triageClaim } from '@/lib/ai'
import { sendClaimConfirmation, sendClaimAlert } from '@/lib/email'
import { PLAN_LIMITS } from '@/types'

const PublicClaimSchema = z.object({
  embed_key: z.string().min(1),
  claimant_name: z.string().min(1).max(100),
  claimant_email: z.string().email(),
  incident_date: z.string().optional(),
  description: z.string().min(10).max(5000),
  financial_impact_description: z.string().max(2000).optional(),
  amount_claimed: z.number().positive(),
  agent_id: z.string().uuid().optional(),
})

function generateClaimNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CLM-${year}-${random}`
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = PublicClaimSchema.safeParse(body)
  if (!parsed.success) return badRequestResponse('Invalid input', parsed.error.flatten())

  const supabase = createAdminClient()

  // Validate embed key
  const { data: badge, error: badgeError } = await supabase
    .from('badge_embeds')
    .select('*, organizations(*)')
    .eq('embed_key', parsed.data.embed_key)
    .eq('active', true)
    .single()

  if (badgeError || !badge) {
    return NextResponse.json({ error: 'Invalid or inactive embed key' }, { status: 400 })
  }

  const org = Array.isArray(badge.organizations) ? badge.organizations[0] : badge.organizations

  // Create claim
  const claimNumber = generateClaimNumber()
  const statusToken = generateToken()

  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      claim_number: claimNumber,
      public_status_token: statusToken,
      org_id: badge.org_id,
      agent_id: parsed.data.agent_id || null,
      claimant_email: parsed.data.claimant_email,
      claimant_name: parsed.data.claimant_name,
      incident_date: parsed.data.incident_date || null,
      description: parsed.data.description,
      financial_impact_description: parsed.data.financial_impact_description || null,
      amount_claimed: parsed.data.amount_claimed,
      status: 'submitted',
      ai_triage_status: 'not_started',
    })
    .select()
    .single()

  if (claimError || !claim) return serverErrorResponse('Failed to create claim')

  // Create initial status event
  await supabase.from('claim_status_events').insert({
    claim_id: claim.id,
    status: 'submitted',
    message: 'Your claim has been received and is being reviewed.',
    public: true,
  })

  // Update last_used_at on badge
  await supabase.from('badge_embeds').update({ last_used_at: new Date().toISOString() }).eq('id', badge.id)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Send emails
  await sendClaimConfirmation({
    to: parsed.data.claimant_email,
    claimantName: parsed.data.claimant_name,
    claimNumber,
    statusToken,
  })

  // Get org admin emails
  const { data: adminMembers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', badge.org_id)
    .in('role', ['owner', 'admin'])

  if (adminMembers && adminMembers.length > 0) {
    const adminEmails: string[] = []
    for (const member of adminMembers) {
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
      if (userData?.user?.email) adminEmails.push(userData.user.email)
    }

    if (adminEmails.length > 0) {
      let agentName: string | undefined
      if (parsed.data.agent_id) {
        const { data: agent } = await supabase.from('agents').select('name').eq('id', parsed.data.agent_id).single()
        agentName = agent?.name
      }

      await sendClaimAlert({
        adminEmails,
        claimNumber,
        amountClaimed: parsed.data.amount_claimed,
        claimantName: parsed.data.claimant_name,
        agentName,
        dashboardUrl: `${appUrl}/dashboard/claims`,
      })
    }
  }

  // Trigger AI triage (background)
  setImmediate(async () => {
    try {
      await supabase.from('claims').update({ ai_triage_status: 'processing' }).eq('id', claim.id)

      let agentData = null
      if (parsed.data.agent_id) {
        const { data } = await supabase.from('agents').select('type, description').eq('id', parsed.data.agent_id).single()
        agentData = data
      }

      const planKey = (org?.plan || 'none') as keyof typeof PLAN_LIMITS
      const limits = PLAN_LIMITS[planKey]

      const { result, error: aiError } = await triageClaim({
        description: parsed.data.description,
        financial_impact_description: parsed.data.financial_impact_description,
        amount_claimed: parsed.data.amount_claimed,
        incident_date: parsed.data.incident_date,
        agent_type: agentData?.type,
        agent_description: agentData?.description,
        coverage_limit: limits.coverage,
        per_incident_limit: limits.per_incident,
      })

      if (result) {
        await supabase.from('claims').update({
          ai_triage_result: result as unknown as Record<string, unknown>,
          ai_triage_status: 'completed',
        }).eq('id', claim.id)
      } else {
        await supabase.from('claims').update({ ai_triage_status: 'failed' }).eq('id', claim.id)
        console.error('AI triage failed:', aiError)
      }
    } catch (err) {
      console.error('AI triage error:', err)
      await supabase.from('claims').update({ ai_triage_status: 'failed' }).eq('id', claim.id)
    }
  })

  return NextResponse.json({
    claim_number: claimNumber,
    public_status_token: statusToken,
    status: 'submitted',
  }, { status: 201 })
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*, agents(name, type)')
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false })

  if (error) return serverErrorResponse()

  return NextResponse.json(data)
}
