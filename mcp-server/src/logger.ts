import type { CanopyConfig } from './types.js'
import type { ActionLog } from './types.js'

export async function logAction(config: CanopyConfig, log: ActionLog): Promise<void> {
  // POST to /api/ingest/action on the Canopy app
  // Fire and forget — don't block the tool call
  // Include X-Canopy-Agent-Id and X-Canopy-Api-Key headers
  fetch(`${config.apiUrl}/api/ingest/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Canopy-Agent-Id': config.agentId,
      'X-Canopy-Api-Key': config.apiKey,
    },
    body: JSON.stringify(log),
  }).catch(() => {}) // never throw — don't break the agent
}
