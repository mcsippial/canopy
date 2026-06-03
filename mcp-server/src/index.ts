import { startProxy } from './proxy.js'
import type { CanopyConfig } from './types.js'

const config: CanopyConfig = {
  agentId: process.env.CANOPY_AGENT_ID!,
  apiKey: process.env.CANOPY_API_KEY!,
  apiUrl: process.env.CANOPY_API_URL || 'https://canopy-lyart.vercel.app',
  upstreamCommand: process.env.UPSTREAM_MCP_COMMAND!,
  upstreamArgs: (process.env.UPSTREAM_MCP_ARGS || '').split(' ').filter(Boolean),
  maxToolCallDepth: parseInt(process.env.MAX_TOOL_CALL_DEPTH || '5'),
  maxActionsPerDay: parseInt(process.env.MAX_ACTIONS_PER_DAY || '1000'),
  policyEnforcement: (process.env.POLICY_ENFORCEMENT as CanopyConfig['policyEnforcement']) || 'log_only',
}

// Validate required config
if (!config.agentId || !config.apiKey || !config.upstreamCommand) {
  console.error('[Canopy] Missing required environment variables: CANOPY_AGENT_ID, CANOPY_API_KEY, UPSTREAM_MCP_COMMAND')
  process.exit(1)
}

console.error(`[Canopy] Starting monitor for agent ${config.agentId}`)
console.error(`[Canopy] Policy enforcement: ${config.policyEnforcement}`)
console.error(`[Canopy] Proxying: ${config.upstreamCommand} ${config.upstreamArgs.join(' ')}`)

startProxy(config).catch((err) => {
  console.error('[Canopy] Fatal error:', err)
  process.exit(1)
})
