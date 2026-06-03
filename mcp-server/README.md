# Canopy MCP Monitor

A transparent MCP (Model Context Protocol) proxy server that sits between your AI agent and its tools. Every tool call passes through Canopy, gets logged, checked against policy parameters, and flagged if anomalous.

## How It Works

```
AI Agent (Claude, GPT-4, etc.)
        |
        | MCP protocol (stdio)
        v
+---------------------------+
|   Canopy MCP Monitor      |
|  - Log every tool call    |
|  - Check policy limits    |
|  - Detect anomalies       |
|  - Block if configured    |
+---------------------------+
        |
        | MCP protocol (stdio)
        v
Real MCP Tool Server
(filesystem, GitHub, Postgres, etc.)
        |
        v
+---------------------------+
|   Canopy Dashboard        |
|  canopy-lyart.vercel.app  |
|  - Audit log              |
|  - Anomaly alerts         |
|  - Policy violations      |
+---------------------------+
```

## Installation

```bash
npm install -g @canopy/mcp-server
```

## Configuration

All configuration is via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CANOPY_AGENT_ID` | Yes | — | Your agent's UUID from the Canopy dashboard |
| `CANOPY_API_KEY` | Yes | — | Your embed key from Canopy badge settings |
| `CANOPY_API_URL` | No | `https://canopy-lyart.vercel.app` | Canopy API base URL |
| `UPSTREAM_MCP_COMMAND` | Yes | — | Command to start the real MCP server (e.g. `npx`) |
| `UPSTREAM_MCP_ARGS` | No | `""` | Space-separated arguments for the upstream command |
| `MAX_TOOL_CALL_DEPTH` | No | `5` | Maximum tool call nesting depth before violation |
| `MAX_ACTIONS_PER_DAY` | No | `1000` | Maximum tool calls per day before violation |
| `POLICY_ENFORCEMENT` | No | `log_only` | What to do on violations: `log_only`, `warn`, or `block` |

## Usage with Claude Desktop

Add to your `claude_desktop_config.json` (usually `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "my-tools-monitored": {
      "command": "canopy-mcp",
      "env": {
        "CANOPY_AGENT_ID": "your-agent-id",
        "CANOPY_API_KEY": "your-embed-key",
        "CANOPY_API_URL": "https://canopy-lyart.vercel.app",
        "UPSTREAM_MCP_COMMAND": "npx",
        "UPSTREAM_MCP_ARGS": "-y @modelcontextprotocol/server-filesystem /path/to/files",
        "MAX_TOOL_CALL_DEPTH": "5",
        "MAX_ACTIONS_PER_DAY": "1000",
        "POLICY_ENFORCEMENT": "log_only"
      }
    }
  }
}
```

## Usage with Any MCP-Compatible Agent

Canopy MCP Monitor uses the standard MCP stdio transport. Any agent that supports MCP can be monitored by wrapping its tool server:

```bash
CANOPY_AGENT_ID=<id> \
CANOPY_API_KEY=<key> \
UPSTREAM_MCP_COMMAND=npx \
UPSTREAM_MCP_ARGS="-y @modelcontextprotocol/server-github" \
canopy-mcp
```

The monitor exposes exactly the same tools as the upstream server — your agent doesn't need any changes.

## What Gets Monitored

Every tool call is recorded with:

- **Tool name** — which tool was called
- **Input hash** — SHA-like hash of the arguments (for loop detection, not the raw data)
- **Output hash** — hash of the response
- **Call depth** — how deep in a chain of tool calls this occurred
- **Duration** — how long the upstream tool took to respond
- **Timestamp** — when the call occurred
- **Compliance status** — whether it violated any policy limits
- **Anomaly flags** — if the call looks unusual

## Policy Enforcement Modes

| Mode | Behavior |
|------|----------|
| `log_only` | Log everything, never block. Safe for getting started. |
| `warn` | Log violations with `warning` severity. Still forward the call. |
| `block` | Block calls that exceed depth or daily action limits. Returns an error to the agent. |

## Anomaly Detection

The monitor checks for four anomaly types on every tool call:

1. **Rate spike** — more than 10x the average call rate in the last 5 minutes
2. **Input loop** — same input hash 3+ times in a row (infinite loop detection)
3. **Unusual tool** — tool not seen in the last 100 actions (possible prompt injection)
4. **High token usage** — estimated tokens more than 3x the agent's average

## Viewing Logs in the Canopy Dashboard

1. Go to [canopy-lyart.vercel.app](https://canopy-lyart.vercel.app) and log in
2. Navigate to **Agents** — each agent shows:
   - Last seen timestamp
   - Actions today
   - Policy violations
   - Live monitoring status indicator (green/yellow/red)
3. Navigate to **Usage** for detailed audit logs per agent

## Development

```bash
cd mcp-server
npm install
npm run dev   # runs with tsx (no build needed)
npm run build # compile to dist/
npm start     # run compiled version
```
