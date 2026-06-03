-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Organizations
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text not null default 'none' check (plan in ('none', 'starter', 'growth', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  coverage_limit numeric,
  covered_users_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organization members
create table if not exists organization_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member', 'billing', 'viewer')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Agents
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('customer_service', 'financial', 'workflow', 'knowledge', 'other')),
  description text,
  actions_description text,
  connected_systems text,
  risk_score integer check (risk_score >= 0 and risk_score <= 100),
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  risk_assessment jsonb,
  status text not null default 'review' check (status in ('active', 'review', 'suspended')),
  daily_actions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Policies
create table if not exists policies (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  plan text not null check (plan in ('starter', 'growth', 'enterprise')),
  coverage_limit numeric not null,
  per_incident_limit numeric not null,
  premium_monthly numeric,
  status text not null check (status in ('active', 'pending', 'expired', 'canceled')),
  effective_at timestamptz,
  renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Policy terms
create table if not exists policy_terms (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references policies(id) on delete cascade not null,
  covered_events jsonb not null,
  exclusions jsonb not null,
  deductible numeric default 0,
  waiting_period_days integer default 0,
  max_claims_per_period integer,
  jurisdiction text,
  document_url text,
  created_at timestamptz not null default now()
);

-- Covered users
create table if not exists covered_users (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  external_user_id text,
  email text not null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- Claims
create table if not exists claims (
  id uuid primary key default uuid_generate_v4(),
  claim_number text unique not null,
  public_status_token text unique not null,
  org_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete set null,
  claimant_email text not null,
  claimant_name text not null,
  incident_date date,
  description text not null,
  financial_impact_description text,
  amount_claimed numeric not null,
  amount_approved numeric,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'pending_docs', 'approved', 'denied', 'paid')),
  ai_triage_result jsonb,
  ai_triage_status text check (ai_triage_status in ('not_started', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Claim attachments
create table if not exists claim_attachments (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  storage_path text not null,
  file_name text,
  content_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

-- Claim status events
create table if not exists claim_status_events (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  status text not null,
  message text not null,
  public boolean not null default true,
  created_at timestamptz not null default now()
);

-- Badge embeds
create table if not exists badge_embeds (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  embed_key text unique not null,
  domain_whitelist text[] not null default '{}',
  active boolean not null default false,
  last_used_at timestamptz,
  rotated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete set null,
  external_action_id text,
  external_user_id text,
  action_type text not null,
  action_description text,
  occurred_at timestamptz not null default now(),
  severity text check (severity in ('info', 'warning', 'error', 'critical')),
  metadata jsonb,
  input_hash text,
  output_hash text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_agent_idx on audit_log(org_id, agent_id, occurred_at);
create index if not exists audit_log_org_user_idx on audit_log(org_id, external_user_id);

-- Stripe events (idempotency)
create table if not exists stripe_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- RLS helper functions
create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_members.org_id = $1
    and organization_members.user_id = auth.uid()
  )
$$;

create or replace function has_org_role(org_id uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_members.org_id = $1
    and organization_members.user_id = auth.uid()
    and organization_members.role = any(roles)
  )
$$;

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table agents enable row level security;
alter table policies enable row level security;
alter table policy_terms enable row level security;
alter table covered_users enable row level security;
alter table claims enable row level security;
alter table claim_attachments enable row level security;
alter table claim_status_events enable row level security;
alter table badge_embeds enable row level security;
alter table audit_log enable row level security;
alter table stripe_events enable row level security;

-- RLS policies for organizations
create policy "Org members can view org" on organizations
  for select using (is_org_member(id));

create policy "Org owners can update org" on organizations
  for update using (has_org_role(id, array['owner', 'admin']));

-- RLS policies for organization_members
create policy "Org members can view members" on organization_members
  for select using (is_org_member(org_id));

create policy "Org owners can manage members" on organization_members
  for all using (has_org_role(org_id, array['owner', 'admin']));

-- RLS policies for agents
create policy "Org members can view agents" on agents
  for select using (is_org_member(org_id));

create policy "Org admins can manage agents" on agents
  for all using (has_org_role(org_id, array['owner', 'admin', 'member']));

-- RLS policies for policies
create policy "Org members can view policies" on policies
  for select using (is_org_member(org_id));

-- RLS policies for covered_users
create policy "Org members can view covered_users" on covered_users
  for select using (is_org_member(org_id));

create policy "Org admins can manage covered_users" on covered_users
  for all using (has_org_role(org_id, array['owner', 'admin', 'member']));

-- RLS policies for claims
create policy "Org members can view claims" on claims
  for select using (is_org_member(org_id));

create policy "Org admins can manage claims" on claims
  for all using (has_org_role(org_id, array['owner', 'admin']));

-- RLS policies for claim_attachments
create policy "Org members can view claim attachments" on claim_attachments
  for select using (
    exists (select 1 from claims where claims.id = claim_id and is_org_member(claims.org_id))
  );

-- RLS policies for claim_status_events
create policy "Org members can view all claim events" on claim_status_events
  for select using (
    exists (select 1 from claims where claims.id = claim_id and is_org_member(claims.org_id))
  );

-- RLS policies for badge_embeds
create policy "Org members can view badge embeds" on badge_embeds
  for select using (is_org_member(org_id));

create policy "Org admins can manage badge embeds" on badge_embeds
  for all using (has_org_role(org_id, array['owner', 'admin']));

-- RLS policies for audit_log
create policy "Org members can view audit log" on audit_log
  for select using (is_org_member(org_id));

-- RLS policies for stripe_events (admin only via service role)
create policy "No direct access to stripe_events" on stripe_events
  for select using (false);
