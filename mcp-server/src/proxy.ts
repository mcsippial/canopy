import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { CanopyConfig, ActionLog } from './types.js'
import { checkCompliance } from './monitor.js'
import { detectAnomalies } from './anomaly.js'
import { logAction } from './logger.js'

export async function startProxy(config: CanopyConfig): Promise<void> {
  // 1. Connect to the upstream MCP server as a client
  const upstream = new Client({ name: 'canopy-proxy', version: '0.1.0' }, { capabilities: {} })
  const upstreamTransport = new StdioClientTransport({
    command: config.upstreamCommand,
    args: config.upstreamArgs,
  })
  await upstream.connect(upstreamTransport)

  // 2. Discover upstream tools
  const { tools } = await upstream.listTools()

  // 3. Create our MCP server that exposes the same tools
  const server = new Server(
    { name: 'canopy-monitor', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  let callDepth = 0
  let todayActionCount = 0
  const recentActions: ActionLog[] = []

  // 4. Register all upstream tools as pass-through with monitoring
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    callDepth++
    todayActionCount++
    const startTime = Date.now()

    const inputHash = createHash(JSON.stringify(request.params.arguments))

    // Check compliance
    const compliance = checkCompliance(
      request.params.name,
      callDepth,
      todayActionCount,
      config
    )

    // Build action log
    const actionLog: ActionLog = {
      agentId: config.agentId,
      actionType: compliance.compliant ? 'tool_call' : 'policy_violation',
      toolName: request.params.name,
      inputHash,
      callDepth,
      blocked: compliance.shouldBlock,
      violationReason: compliance.violations.join('; ') || undefined,
      occurredAt: new Date().toISOString(),
    }

    // Check for anomalies
    const anomaly = detectAnomalies(recentActions, actionLog)
    if (anomaly.anomalyDetected) {
      logAction(config, {
        ...actionLog,
        actionType: 'anomaly',
        metadata: {
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          description: anomaly.description,
        },
      })
    }

    // Log the action (fire and forget)
    logAction(config, actionLog)

    // Track in recent actions
    recentActions.push(actionLog)
    // Keep only last 100 for anomaly detection
    if (recentActions.length > 100) recentActions.shift()

    // Block if enforcement mode says so
    if (compliance.shouldBlock) {
      callDepth--
      return {
        content: [
          {
            type: 'text' as const,
            text: `[CANOPY POLICY BLOCK] This tool call was blocked by your Canopy AI liability policy. Reason: ${compliance.violations.join('; ')}. Contact your administrator.`,
          },
        ],
        isError: true,
      }
    }

    // Forward to upstream
    const result = await upstream.callTool({
      name: request.params.name,
      arguments: request.params.arguments ?? {},
    })

    const durationMs = Date.now() - startTime
    const outputHash = createHash(JSON.stringify(result))

    // Log response
    logAction(config, {
      ...actionLog,
      actionType: 'tool_response',
      outputHash,
      durationMs,
      blocked: false,
    })

    callDepth--
    return result
  })

  // 5. Start serving
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

function createHash(input: string): string {
  // Simple hash for demo — in production use crypto.createHash('sha256')
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
