-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text DEFAULT 'none' CHECK (plan IN ('none', 'starter', 'growth', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  coverage_limit numeric,
  covered_users_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization members
CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'billing', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- Agents
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('customer_service', 'financial', 'workflow', 'knowledge', 'other')),
  description text,
  actions_description text,
  connected_systems text,
  risk_score integer CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_assessment jsonb,
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('active', 'review', 'suspended')),
  daily_actions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Policies
CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('starter', 'growth', 'enterprise')),
  coverage_limit numeric NOT NULL,
  per_incident_limit numeric NOT NULL,
  premium_monthly numeric,
  status text NOT NULL CHECK (status IN ('active', 'pending', 'expired', 'canceled')),
  effective_at timestamptz,
  renews_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Policy terms
CREATE TABLE policy_terms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE,
  covered_events jsonb NOT NULL,
  exclusions jsonb NOT NULL,
  deductible numeric DEFAULT 0,
  waiting_period_days integer DEFAULT 0,
  max_claims_per_period integer,
  jurisdiction text,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Covered users
CREATE TABLE covered_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  external_user_id text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

-- Claims
CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number text UNIQUE NOT NULL,
  public_status_token text UNIQUE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  claimant_email text NOT NULL,
  claimant_name text NOT NULL,
  incident_date date,
  description text NOT NULL,
  financial_impact_description text,
  amount_claimed numeric NOT NULL,
  amount_approved numeric,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'pending_docs', 'approved', 'denied', 'paid')),
  ai_triage_result jsonb,
  ai_triage_status text CHECK (ai_triage_status IN ('not_started', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Claim attachments
CREATE TABLE claim_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  content_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Claim status events
CREATE TABLE claim_status_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text NOT NULL,
  public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Badge embeds
CREATE TABLE badge_embeds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  embed_key text UNIQUE NOT NULL,
  domain_whitelist text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  external_action_id text,
  external_user_id text,
  action_type text NOT NULL,
  action_description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  severity text CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata jsonb,
  input_hash text,
  output_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org_agent_occurred ON audit_log (org_id, agent_id, occurred_at);
CREATE INDEX idx_audit_log_org_user ON audit_log (org_id, external_user_id);

-- Stripe events (idempotency)
CREATE TABLE stripe_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Helper functions
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = is_org_member.org_id
    AND organization_members.user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_org_role(org_id uuid, roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = has_org_role.org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = ANY(roles)
  )
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE covered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view their org
CREATE POLICY "org members can view" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "org owners can update" ON organizations FOR UPDATE USING (has_org_role(id, ARRAY['owner', 'admin']));

-- Org members
CREATE POLICY "members can view own org members" ON organization_members FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "owners can manage members" ON organization_members FOR ALL USING (has_org_role(org_id, ARRAY['owner', 'admin']));

-- Agents
CREATE POLICY "org members can view agents" ON agents FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "org admin can mutate agents" ON agents FOR ALL USING (has_org_role(org_id, ARRAY['owner', 'admin', 'member']));

-- Policies
CREATE POLICY "org members can view policies" ON policies FOR SELECT USING (is_org_member(org_id));

-- Policy terms
CREATE POLICY "org members can view policy terms" ON policy_terms FOR SELECT USING (
  EXISTS (SELECT 1 FROM policies WHERE policies.id = policy_terms.policy_id AND is_org_member(policies.org_id))
);

-- Covered users
CREATE POLICY "org members can view covered users" ON covered_users FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "org admin can mutate covered users" ON covered_users FOR ALL USING (has_org_role(org_id, ARRAY['owner', 'admin', 'member']));

-- Claims
CREATE POLICY "org members can view claims" ON claims FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "org admin can mutate claims" ON claims FOR ALL USING (has_org_role(org_id, ARRAY['owner', 'admin']));

-- Claim attachments
CREATE POLICY "org members can view attachments" ON claim_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM claims WHERE claims.id = claim_attachments.claim_id AND is_org_member(claims.org_id))
);

-- Claim status events
CREATE POLICY "org members can view status events" ON claim_status_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM claims WHERE claims.id = claim_status_events.claim_id AND is_org_member(claims.org_id))
);

-- Badge embeds
CREATE POLICY "org members can view badge embeds" ON badge_embeds FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "org admin can mutate badge embeds" ON badge_embeds FOR ALL USING (has_org_role(org_id, ARRAY['owner', 'admin']));

-- Audit log
CREATE POLICY "org members can view audit log" ON audit_log FOR SELECT USING (is_org_member(org_id));
