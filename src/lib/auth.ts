import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getUserOrgMembership(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(*)')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function badRequestResponse(message = 'Bad request', details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function serverErrorResponse(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}
