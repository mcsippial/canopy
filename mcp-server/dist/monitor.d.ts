import type { CanopyConfig } from './types.js';
type ComplianceResult = {
    compliant: boolean;
    violations: string[];
    shouldBlock: boolean;
};
export declare function checkCompliance(toolName: string, callDepth: number, todayActionCount: number, config: CanopyConfig): ComplianceResult;
export {};
//# sourceMappingURL=monitor.d.ts.map