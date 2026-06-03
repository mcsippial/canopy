export function checkCompliance(toolName, callDepth, todayActionCount, config) {
    const violations = [];
    if (callDepth > config.maxToolCallDepth) {
        violations.push(`Tool call depth ${callDepth} exceeds registered maximum of ${config.maxToolCallDepth}`);
    }
    if (todayActionCount > config.maxActionsPerDay) {
        violations.push(`Daily action count ${todayActionCount} exceeds registered maximum of ${config.maxActionsPerDay}`);
    }
    const shouldBlock = config.policyEnforcement === 'block' && violations.length > 0;
    return {
        compliant: violations.length === 0,
        violations,
        shouldBlock,
    };
}
//# sourceMappingURL=monitor.js.map