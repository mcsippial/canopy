import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)]
  return key
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function supabaseRequest(path: string, options: RequestInit, token?: string) {
  const key = token ? token : SUPABASE_SERVICE_KEY
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  })
  return res
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { companyName, fullName, email, password } = parsed.data

    // Step 1: Sign up user via Supabase Auth REST API
    const signupRes = await supabaseRequest('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: { full_name: fullName },
      }),
    })
    const signupData = await signupRes.json()
    if (!signupRes.ok || !signupData.id) {
      return NextResponse.json({ error: signupData.msg || signupData.error_description || 'Signup failed' }, { status: 400 })
    }
    const userId = signupData.id

    // Step 2: Create organization (using service role to bypass RLS for setup)
    const slug = slugify(companyName) + '-' + Date.now()
    const orgRes = await supabaseRequest('/rest/v1/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: companyName, slug, plan: 'none' }),
    })
    const orgData = await orgRes.json()
    if (!orgRes.ok || !orgData[0]?.id) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }
    const org = orgData[0]

    // Step 3: Create membership
    await supabaseRequest('/rest/v1/organization_members', {
      method: 'POST',
      body: JSON.stringify({ org_id: org.id, user_id: userId, role: 'owner' }),
    })

    // Step 4: Create badge embed
    await supabaseRequest('/rest/v1/badge_embeds', {
      method: 'POST',
      body: JSON.stringify({ org_id: org.id, embed_key: generateEmbedKey(), active: false }),
    })

    // Step 5: Sign in to get session tokens
    const signinRes = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const signinData = await signinRes.json()

    if (!signinRes.ok || !signinData.access_token) {
      return NextResponse.json({ error: 'Account created. Please log in.' }, { status: 200 })
    }

    // Return tokens to client so it can set the session
    return NextResponse.json({
      success: true,
      access_token: signinData.access_token,
      refresh_token: signinData.refresh_token,
    })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
