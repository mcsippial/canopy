import type { ActionLog } from './types.js';
type AnomalyResult = {
    anomalyDetected: boolean;
    anomalyType?: string;
    severity?: 'low' | 'medium' | 'high';
    description?: string;
};
export declare function detectAnomalies(recentActions: ActionLog[], currentAction: Partial<ActionLog>): AnomalyResult;
export {};
//# sourceMappingURL=anomaly.d.ts.map