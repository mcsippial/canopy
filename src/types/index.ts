export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'none' | 'starter' | 'growth' | 'enterprise'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  coverage_limit?: number
  covered_users_limit?: number
  monthly_token_limit?: number
  monthly_action_limit?: number
  tokens_used_this_period?: number
  actions_used_this_period?: number
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'billing' | 'viewer'
  created_at: string
}

export interface Agent {
  id: string
  org_id: string
  name: string
  type: 'customer_service' | 'financial' | 'workflow' | 'knowledge' | 'other'
  description?: string
  actions_description?: string
  connected_systems?: string
  risk_score?: number
  risk_level?: 'low' | 'medium' | 'high'
  risk_assessment?: Record<string, unknown>
  status: 'active' | 'review' | 'suspended'
  daily_actions: number
  // New usage-based fields
  model_name?: string
  model_provider?: 'openai' | 'anthropic' | 'google' | 'mistral' | 'other'
  avg_tokens_per_action?: number
  pricing_model?: 'per_token' | 'per_call' | 'per_minute' | 'flat_rate' | 'unknown'
  max_actions_per_day?: number
  deployment_type?: 'realtime' | 'batch' | 'scheduled' | 'event_driven'
  uses_tool_calls?: boolean
  max_tool_call_depth?: number
  human_in_loop?: boolean
  detection_lag_minutes?: number
  underwriting_status?: 'pending' | 'approved' | 'declined' | 'referred' | 'expired'
  current_underwriting_id?: string | null
  risk_score_locked_at?: string | null
  created_at: string
  updated_at: string
}

export interface Policy {
  id: string
  org_id: string
  plan: 'starter' | 'growth' | 'enterprise'
  coverage_limit: number
  per_incident_limit: number
  premium_monthly?: number
  status: 'active' | 'pending' | 'expired' | 'canceled'
  effective_at?: string
  renews_at?: string
  created_at: string
  updated_at: string
}

export interface CoveredUser {
  id: string
  org_id: string
  external_user_id?: string
  email: string
  created_at: string
}

export interface Claim {
  id: string
  claim_number: string
  public_status_token: string
  org_id: string
  agent_id?: string
  claimant_email: string
  claimant_name: string
  incident_date?: string
  description: string
  financial_impact_description?: string
  amount_claimed: number
  amount_approved?: number
  status: 'submitted' | 'under_review' | 'pending_docs' | 'approved' | 'denied' | 'paid'
  ai_triage_result?: Record<string, unknown>
  ai_triage_status?: 'not_started' | 'processing' | 'completed' | 'failed'
  // New usage-based fields
  error_started_at?: string
  error_detected_at?: string
  actions_during_incident?: number
  tokens_consumed_during_incident?: number
  model_at_time_of_incident?: string
  damage_multiplier?: number
  coverage_check_result?: Record<string, unknown>
  created_at: string
  updated_at: string
  resolved_at?: string
  agents?: { name: string; type: string } | null
}

export interface ClaimAttachment {
  id: string
  claim_id: string
  storage_path: string
  file_name?: string
  content_type?: string
  size_bytes?: number
  created_at: string
}

export interface ClaimStatusEvent {
  id: string
  claim_id: string
  status: string
  message: string
  public: boolean
  created_at: string
}

export interface BadgeEmbed {
  id: string
  org_id: string
  embed_key: string
  domain_whitelist: string[]
  active: boolean
  last_used_at?: string
  rotated_at?: string
  created_at: string
}

export interface AuditLog {
  id: string
  org_id: string
  agent_id?: string
  external_action_id?: string
  external_user_id?: string
  action_type: string
  action_description?: string
  occurred_at: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  metadata?: Record<string, unknown>
  input_hash?: string
  output_hash?: string
  created_at: string
}

export interface StripeEvent {
  id: string
  stripe_event_id: string
  event_type: string
  payload: Record<string, unknown>
  processed_at: string
}

export interface UsageRecord {
  id: string
  org_id: string
  agent_id: string
  period_start: string
  period_end: string
  total_actions: number
  total_tokens: number
  total_tool_calls: number
  model_name?: string
  estimated_cost_usd?: number
  created_at: string
}

export const PLAN_LIMITS = {
  none: { agents: 0, users: 0, coverage: 0, per_incident: 0, monthly: 0, monthly_tokens: 0, monthly_actions: 0, overage_per_1k_tokens: 0 },
  starter: { agents: 2, users: 500, coverage: 500000, per_incident: 50000, monthly: 299, monthly_tokens: 1_000_000, monthly_actions: 10_000, overage_per_1k_tokens: 0.10 },
  growth: { agents: 5, users: 5000, coverage: 2_000_000, per_incident: 250_000, monthly: 899, monthly_tokens: 10_000_000, monthly_actions: 100_000, overage_per_1k_tokens: 0.08 },
  enterprise: { agents: Infinity, users: Infinity, coverage: 5_000_000, per_incident: 1_000_000, monthly: 0, monthly_tokens: Infinity, monthly_actions: Infinity, overage_per_1k_tokens: 0 },
} as const
