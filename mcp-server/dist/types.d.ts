export type CanopyConfig = {
    agentId: string;
    apiKey: string;
    apiUrl: string;
    upstreamCommand: string;
    upstreamArgs: string[];
    maxToolCallDepth: number;
    maxActionsPerDay: number;
    policyEnforcement: 'log_only' | 'warn' | 'block';
};
export type ActionLog = {
    agentId: string;
    actionType: 'tool_call' | 'tool_response' | 'policy_violation' | 'anomaly';
    toolName: string;
    inputHash: string;
    outputHash?: string;
    tokensEstimated?: number;
    callDepth: number;
    durationMs?: number;
    blocked: boolean;
    violationReason?: string;
    metadata?: Record<string, unknown>;
    occurredAt: string;
};
//# sourceMappingURL=types.d.ts.map