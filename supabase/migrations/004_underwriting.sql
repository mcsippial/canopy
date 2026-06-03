-- Underwriting decisions per agent
create table if not exists underwriting_decisions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  decision text not null check (decision in ('approved', 'declined', 'referred')),
  eligible boolean not null,
  recommended_plan text,
  per_agent_sublimit numeric,
  per_incident_limit numeric,
  deductible numeric,
  exclusions jsonb not null default '[]',
  conditions jsonb not null default '[]',
  underwriting_basis jsonb not null,
  risk_score_locked integer,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  superseded_by uuid references underwriting_decisions(id),
  created_at timestamptz not null default now()
);

alter table underwriting_decisions enable row level security;

create policy "Org members can view underwriting decisions" on underwriting_decisions
  for select using (is_org_member(org_id));

create policy "Org admins can insert underwriting decisions" on underwriting_decisions
  for all using (has_org_role(org_id, array['owner', 'admin']));

-- Add underwriting status to agents
alter table agents
  add column if not exists underwriting_status text check (underwriting_status in ('pending', 'approved', 'declined', 'referred', 'expired')) default 'pending',
  add column if not exists current_underwriting_id uuid references underwriting_decisions(id),
  add column if not exists risk_score_locked_at timestamptz;

-- Policy documents (structured)
create table if not exists policy_documents (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  policy_number text unique not null,
  status text not null check (status in ('draft', 'active', 'expired', 'canceled')) default 'draft',
  document jsonb not null,
  aggregate_limit numeric not null,
  per_incident_limit numeric not null,
  premium_monthly numeric not null,
  effective_at timestamptz,
  expires_at timestamptz,
  issued_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table policy_documents enable row level security;

create policy "Org members can view policy documents" on policy_documents
  for select using (is_org_member(org_id));

create policy "Org admins can manage policy documents" on policy_documents
  for all using (has_org_role(org_id, array['owner', 'admin']));
