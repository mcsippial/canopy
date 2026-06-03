-- Migration 003: Usage-based model for AI agent liability

-- ============================================================
-- 1. Extend agents table
-- ============================================================
alter table agents
  add column if not exists model_name text,
  add column if not exists model_provider text check (model_provider in ('openai', 'anthropic', 'google', 'mistral', 'other')),
  add column if not exists avg_tokens_per_action integer,
  add column if not exists pricing_model text check (pricing_model in ('per_token', 'per_call', 'per_minute', 'flat_rate', 'unknown')),
  add column if not exists max_actions_per_day integer,
  add column if not exists deployment_type text check (deployment_type in ('realtime', 'batch', 'scheduled', 'event_driven')),
  add column if not exists uses_tool_calls boolean not null default false,
  add column if not exists max_tool_call_depth integer,
  add column if not exists human_in_loop boolean not null default false,
  add column if not exists detection_lag_minutes integer;

-- ============================================================
-- 2. Extend claims table
-- ============================================================
alter table claims
  add column if not exists error_started_at timestamptz,
  add column if not exists error_detected_at timestamptz,
  add column if not exists actions_during_incident integer,
  add column if not exists tokens_consumed_during_incident bigint,
  add column if not exists model_at_time_of_incident text,
  add column if not exists damage_multiplier numeric,
  add column if not exists coverage_check_result jsonb;

-- ============================================================
-- 3. New usage_records table
-- ============================================================
create table if not exists usage_records (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_actions bigint not null default 0,
  total_tokens bigint not null default 0,
  total_tool_calls bigint not null default 0,
  model_name text,
  estimated_cost_usd numeric,
  created_at timestamptz not null default now()
);

-- RLS for usage_records
alter table usage_records enable row level security;

create policy "Org members can view usage records"
  on usage_records for select
  using (
    exists (
      select 1 from organization_members om
      where om.org_id = usage_records.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org admins can insert usage records"
  on usage_records for insert
  with check (
    exists (
      select 1 from organization_members om
      where om.org_id = usage_records.org_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- 4. Extend organizations table
-- ============================================================
alter table organizations
  add column if not exists monthly_token_limit bigint,
  add column if not exists monthly_action_limit bigint,
  add column if not exists tokens_used_this_period bigint not null default 0,
  add column if not exists actions_used_this_period bigint not null default 0;
