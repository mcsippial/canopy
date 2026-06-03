export type CanopyConfig = {
  agentId: string
  apiKey: string // Canopy API key (the embed_key from badge_embeds)
  apiUrl: string // e.g. https://canopy-lyart.vercel.app
  upstreamCommand: string // the command to start the real MCP server
  upstreamArgs: string[] // args for the real MCP server
  maxToolCallDepth: number // from registered agent parameters
  maxActionsPerDay: number // from registered agent parameters
  policyEnforcement: 'log_only' | 'warn' | 'block' // what to do on violations
}

export type ActionLog = {
  agentId: string
  actionType: 'tool_call' | 'tool_response' | 'policy_violation' | 'anomaly'
  toolName: string
  inputHash: string
  outputHash?: string
  tokensEstimated?: number
  callDepth: number
  durationMs?: number
  blocked: boolean
  violationReason?: string
  metadata?: Record<string, unknown>
  occurredAt: string
}
