import type { CanopyConfig } from './types.js'

type ComplianceResult = {
  compliant: boolean
  violations: string[]
  shouldBlock: boolean
}

export function checkCompliance(
  toolName: string,
  callDepth: number,
  todayActionCount: number,
  config: CanopyConfig
): ComplianceResult {
  const violations: string[] = []

  if (callDepth > config.maxToolCallDepth) {
    violations.push(`Tool call depth ${callDepth} exceeds registered maximum of ${config.maxToolCallDepth}`)
  }

  if (todayActionCount > config.maxActionsPerDay) {
    violations.push(`Daily action count ${todayActionCount} exceeds registered maximum of ${config.maxActionsPerDay}`)
  }

  const shouldBlock = config.policyEnforcement === 'block' && violations.length > 0

  return {
    compliant: violations.length === 0,
    violations,
    shouldBlock,
  }
}
