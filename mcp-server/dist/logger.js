export async function logAction(config, log) {
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
    }).catch(() => { }); // never throw — don't break the agent
}
//# sourceMappingURL=logger.js.map