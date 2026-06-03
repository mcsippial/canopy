import type { ActionLog } from './types.js'

type AnomalyResult = {
  anomalyDetected: boolean
  anomalyType?: string
  severity?: 'low' | 'medium' | 'high'
  description?: string
}

export function detectAnomalies(
  recentActions: ActionLog[],
  currentAction: Partial<ActionLog>
): AnomalyResult {
  const now = Date.now()

  // 1. Sudden spike — more than 10x the average rate in the last 5 minutes
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString()
  const lastFiveMinActions = recentActions.filter(a => a.occurredAt >= fiveMinutesAgo)
  if (recentActions.length > 10) {
    // Compare rate in last 5 min vs. overall average per 5 min window
    const totalMinutes = (now - new Date(recentActions[0].occurredAt).getTime()) / 60000
    const avgPer5Min = totalMinutes > 0 ? (recentActions.length / totalMinutes) * 5 : 0
    if (avgPer5Min > 0 && lastFiveMinActions.length > avgPer5Min * 10) {
      return {
        anomalyDetected: true,
        anomalyType: 'rate_spike',
        severity: 'high',
        description: `Sudden spike: ${lastFiveMinActions.length} actions in last 5 min vs. average of ${avgPer5Min.toFixed(1)}`,
      }
    }
  }

  // 2. Repeated identical inputs (loop detection) — same inputHash 3+ times in a row
  if (currentAction.inputHash && recentActions.length >= 2) {
    const lastTwo = recentActions.slice(-2)
    if (lastTwo.every(a => a.inputHash === currentAction.inputHash)) {
      return {
        anomalyDetected: true,
        anomalyType: 'input_loop',
        severity: 'medium',
        description: `Identical input hash seen 3+ times in a row — possible loop detected`,
      }
    }
  }

  // 3. Unusual tool — tool name not seen in the last 100 actions
  if (currentAction.toolName && recentActions.length >= 10) {
    const last100 = recentActions.slice(-100)
    const knownTools = new Set(last100.map(a => a.toolName))
    if (!knownTools.has(currentAction.toolName)) {
      return {
        anomalyDetected: true,
        anomalyType: 'unusual_tool',
        severity: 'low',
        description: `Tool "${currentAction.toolName}" has not been seen in the last ${last100.length} actions`,
      }
    }
  }

  // 4. Very high estimated tokens — more than 3x the agent's average
  if (currentAction.tokensEstimated && recentActions.length >= 5) {
    const withTokens = recentActions.filter(a => a.tokensEstimated != null)
    if (withTokens.length > 0) {
      const avgTokens = withTokens.reduce((s, a) => s + (a.tokensEstimated ?? 0), 0) / withTokens.length
      if (avgTokens > 0 && currentAction.tokensEstimated > avgTokens * 3) {
        return {
          anomalyDetected: true,
          anomalyType: 'high_token_usage',
          severity: 'medium',
          description: `Estimated tokens (${currentAction.tokensEstimated}) is more than 3x the agent average (${avgTokens.toFixed(0)})`,
        }
      }
    }
  }

  return { anomalyDetected: false }
}
