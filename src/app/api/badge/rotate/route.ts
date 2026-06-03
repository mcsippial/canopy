import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getUserOrgMembership, unauthorizedResponse, serverErrorResponse } from '@/lib/auth'

function generateEmbedKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'emb_'
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

export async function POST(_req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthorizedResponse()

  const membership = await getUserOrgMembership(user.id)
  if (!membership) return unauthorizedResponse()

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const supabase = createClient()

  const { data: badge, error: fetchError } = await supabase
    .from('badge_embeds')
    .select('id')
    .eq('org_id', membership.org_id)
    .single()

  if (fetchError || !badge) {
    return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
  }

  const newKey = generateEmbedKey()

  const { data, error: updateError } = await supabase
    .from('badge_embeds')
    .update({
      embed_key: newKey,
      rotated_at: new Date().toISOString(),
    })
    .eq('id', badge.id)
    .select()
    .single()

  if (updateError) return serverErrorResponse()

  return NextResponse.json({ embed_key: data.embed_key, rotated_at: data.rotated_at })
}
