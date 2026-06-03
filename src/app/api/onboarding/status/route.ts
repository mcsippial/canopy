import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  const orgId = membership.org_id
  const supabase = createClient()

  const [agentsRes, auditRes, badgeRes, policyDocsRes] = await Promise.all([
    supabase.from('agents').select('id, risk_score, underwriting_status').eq('org_id', orgId),
    supabase.from('audit_log').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('badge_embeds').select('id, active').eq('org_id', orgId),
    supabase.from('policy_documents').select('id').eq('org_id', orgId),
  ])

  const agents = agentsRes.data || []
  const auditCount = auditRes.count || 0
  const badges = badgeRes.data || []
  const policyDocs = policyDocsRes.data || []

  const steps = [
    {
      id: 'create_account',
      label: 'Create your account',
      description: 'Your Canopy account is set up and ready to go.',
      complete: true,
      actionUrl: null,
    },
    {
      id: 'register_agent',
      label: 'Register your first agent',
      description: 'Tell us about your AI agents so we can assess their risk profile.',
      complete: agents.length > 0,
      actionUrl: '/dashboard/agents',
    },
    {
      id: 'run_risk_scoring',
      label: 'Run risk scoring',
      description: 'Score each agent to determine coverage eligibility and pricing.',
      complete: agents.some((a) => a.risk_score !== null && a.risk_score !== undefined),
      actionUrl: '/dashboard/agents',
    },
    {
      id: 'run_underwriting',
      label: 'Run underwriting',
      description: 'Get a formal underwriting decision for your agents.',
      complete: agents.some((a) => a.underwriting_status === 'approved'),
      actionUrl: '/dashboard/agents',
    },
    {
      id: 'generate_policy',
      label: 'Generate your policy',
      description: 'Issue a coverage policy document for your organization.',
      complete: policyDocs.length > 0,
      actionUrl: '/dashboard/policy',
    },
    {
      id: 'activate_badge',
      label: 'Activate your badge',
      description: 'Embed the Canopy trust badge so your users know they are protected.',
      complete: badges.some((b) => b.active),
      actionUrl: '/dashboard/badge',
    },
    {
      id: 'install_mcp_monitor',
      label: 'Install the MCP monitor',
      description: 'Connect the Canopy MCP server to start recording agent activity.',
      complete: auditCount > 0,
      actionUrl: '/dashboard/badge',
    },
  ]

  return NextResponse.json({ steps })
}
