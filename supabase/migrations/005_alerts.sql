-- Alerts table
create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete set null,
  alert_type text not null check (alert_type in (
    'policy_violation', 'anomaly_detected', 'claim_submitted',
    'claim_status_changed', 'agent_flagged', 'policy_expiring',
    'usage_limit_approaching', 'monitoring_stopped'
  )),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  read boolean not null default false,
  action_url text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table alerts enable row level security;

create policy "Org members can view alerts" on alerts
  for select using (is_org_member(org_id));

create policy "Org admins can manage alerts" on alerts
  for all using (has_org_role(org_id, array['owner', 'admin']));

-- Claim notes table
create table if not exists claim_notes (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

alter table claim_notes enable row level security;

create policy "Org admins can manage claim notes" on claim_notes
  for all using (has_org_role(org_id, array['owner', 'admin']));
