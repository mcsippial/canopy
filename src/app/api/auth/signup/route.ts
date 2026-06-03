import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const SignupSchema = z.object({
  companyName: z.string().min(1).max(100),
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

function generateEmbedKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'emb_'
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { companyName, fullName, email, password } = parsed.data
    const supabase = createAdminClient()

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
    }

    const userId = authData.user.id

    // Generate unique slug
    let slug = slugify(companyName)
    const { data: existingSlugs } = await supabase
      .from('organizations')
      .select('slug')
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${slug}-${Date.now()}`
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug,
        plan: 'none',
      })
      .select()
      .single()

    if (orgError || !org) {
      // Cleanup user on failure
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Create membership (owner)
    const { error: memberError } = await supabase.from('organization_members').insert({
      org_id: org.id,
      user_id: userId,
      role: 'owner',
    })

    if (memberError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }

    // Create default (inactive) badge embed
    await supabase.from('badge_embeds').insert({
      org_id: org.id,
      embed_key: generateEmbedKey(),
      active: false,
    })

    // Sign in the user to get a session
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      return NextResponse.json({ error: 'Account created but sign-in failed. Please log in manually.' }, { status: 200 })
    }

    // Set cookies using the session
    const response = NextResponse.json({ success: true, orgId: org.id })

    // Set auth cookies
    response.cookies.set('sb-access-token', signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: signInData.session.expires_in,
      path: '/',
    })
    response.cookies.set('sb-refresh-token', signInData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
