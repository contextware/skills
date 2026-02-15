---
name: connect-to-nango-mcp
description: Connect agents to external platforms (HubSpot, Salesforce, etc.) via Nango using header authentication.
version: 8.0.0
author: agent-skills-workbench
mcp-servers: ["nango"]
tags: [nango, mcp, integration, hubspot, salesforce, portable]
---

# Nango MCP Integration Skill

This skill enables agents to connect to third-party SaaS platforms (HubSpot, Salesforce, etc.) through Nango's proxy and MCP server.

## MCP Server Requirements

This skill requires the **Nango** MCP server.

**Connection Details:**
- **URL**: `https://api.nango.dev/mcp`
- **Transport**: HTTP

**Authentication:**
The Nango MCP server uses header-based authentication at connection time.

**Required Headers:**
- `Authorization`: `Bearer <NANGO_SECRET_KEY>`
- `connection-id`: `<connectionId from Step 3>`
- `provider-config-key`: `<provider name>`

**Available Tools (vary by provider):**
- HubSpot: `whoami`, `list_contacts`, `create_contact`, `query`
- Salesforce: `query`, `create_record`, `whoami`

## Prerequisites

### Credentials
- `NANGO_SECRET_KEY`: Your Nango secret key from nango.dev.
- `NANGO_DEFAULT_USER_ID`: The end-user identifier used to look up connections (e.g., an email address).

### Runtime
- Node.js 18+ (for bundled scripts using built-in fetch)

---

## ⚠️ CRITICAL: Understanding Connection IDs

**DO NOT confuse these two values:**

| Value | What It Is | Example | Used For |
|-------|-----------|---------|----------|
| `NANGO_DEFAULT_USER_ID` | Your user identifier | `user@example.com` | Script uses this to FIND the connection |
| `connectionId` | Nango's connection ID | `hubspot-abc123` | Required `connection-id` header value |

**The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs`, NOT the `NANGO_DEFAULT_USER_ID`.**

Example script output:
```json
{
  "status": "success",
  "connectionId": "hubspot-abc123",   ← USE THIS as connection-id header
  "endUserId": "user@example.com"     ← This is NOT the connection-id
}
```

---

## Workflow

**IMPORTANT - Understand the Goal**:
This skill is NOT about "connecting to Nango" as an end goal. This skill enables you to **accomplish user tasks** (like getting HubSpot data, listing Salesforce records, etc.) by using Nango as the integration proxy. The connection steps are prerequisites that should flow seamlessly into actually using the tools to fulfill the user's request.

### Phase 1: Verify Tool Availability
First, check if Nango-specific tools (like `whoami`, `list_contacts`, `create_contact`, `query`) are already available in your current execution context.

**Tools already available?** Skip to Phase 3 (Step 3.4) and use the tools immediately to fulfill the user's request.

**Tools NOT available, but you can connect to MCP servers?** Continue to Phase 2 to obtain credentials, then Phase 3 to connect.

**Cannot connect to MCP servers from this context?** This skill requires MCP tools that must be configured before use. Add the Nango MCP server to your agent's MCP configuration with the headers documented in Phase 3. After configuration, restart the agent and retry.

### Phase 2: Handle Authentication
If tools are not available, you must obtain a `connectionId` by running the authentication script.

1. **Identify Provider**: Determine which provider the user wants to connect to (e.g., `hubspot`, `salesforce`) by checking the original request or current skill context. Only ask the user if the provider is not mentioned and cannot be inferred.

2. **Get Secret Key**: Attempt to retrieve the `NANGO_SECRET_KEY` from the environment variables (e.g., via platform tools or direct environment access). Do NOT ask the user for this key if it is already available.

3. **Run the authentication script**: Execute `scripts/check-auth.cjs` passing the inferred provider and the retrieved secret key.
   ```bash
   node scripts/check-auth.cjs <provider> <secret_key>
   ```

4. **Parse the script output (CRITICAL)**: The script outputs JSON to stdout. You MUST parse this JSON and extract the `connectionId` field.

   **Example success output:**
   ```json
   {
     "status": "success",
     "connectionId": "hubspot-abc123",
     "integrationId": "hubspot",
     "endUserId": "user@example.com"
   }
   ```

   **⚠️ IMPORTANT**: Extract and store the `connectionId` value (e.g., `hubspot-abc123`). This is what you will use as the `connection-id` header in Phase 3. Do NOT use `endUserId` or `NANGO_DEFAULT_USER_ID` as the connection-id header.

5. **Handle Response Based on Status**:
   - **`status: "success"`**: You have a valid `connectionId`. Proceed immediately to Phase 3.
   - **`status: "needs_auth"`**: The script returns an `authUrl`. Present this URL to the user and wait for them to confirm completion. Once confirmed, re-run the script to get the `connectionId`.
   - **`status: "error"`**: Report the error to the user.

### Phase 3: Configure, Connect, and Use MCP Server

**[CRITICAL - READ THIS FIRST]**:
Once you have the `connectionId`, you must complete ALL steps below **in one continuous sequence** without stopping or asking for permission. The goal of this skill is NOT to "connect to Nango" - it is to **use Nango to accomplish the user's original request** (e.g., get HubSpot data, list contacts, etc.). Connecting is only a prerequisite step.

**Do NOT**:
- Report "I've configured the headers" and stop
- Report "I've connected to the MCP server" and stop
- Report "Now I can connect" and stop
- Ask for permission between steps 3.1-3.4

**DO**:
- Execute steps 3.1 through 3.4 continuously
- Only report the final result to the user (e.g., the actual HubSpot data)
- If any step fails, report the error with details

---

**Step 3.1 - Provision Authentication Headers:**
Configure the Nango MCP server with these three required headers (use your platform's credential storage mechanism):
- **Server identifier**: `nango-mcp-server` (or similar)
- **Server URL**: `https://api.nango.dev/mcp`
- **Headers to configure** (provision all three):
  1. `Authorization`: `Bearer <NANGO_SECRET_KEY>`
  2. `connection-id`: `<connectionId>` ← **Use the `connectionId` from Phase 2 script output**
  3. `provider-config-key`: `<provider>` (e.g., "hubspot", "salesforce")

**⚠️ COMMON MISTAKE**: Do NOT use `NANGO_DEFAULT_USER_ID` or any email address as the `connection-id`. The `connection-id` must be the Nango connection identifier returned by `check-auth.cjs` (e.g., `hubspot-abc123`), not a user email.

*Platform-specific notes:*
- Some platforms may require separate calls to provision each header
- Others may accept all headers in a single configuration call
- Use whatever credential/header provisioning tool your platform provides

**Step 3.2 - Connect to MCP Server:**
Establish connection to the Nango MCP server. The server will validate your headers and return available tools based on the provider.

*For agents that support programmatic MCP connections and use the MCP SDK:* Use the reference script `scripts/connect-direct.cjs` which demonstrates the connection pattern using the MCP SDK. See the "scripts/connect-direct.cjs" section below for details.

*For agents that suppport programmatic MCP connections but do not use the MCP SDK: They can use the following pattern:*

Regardless of vendor, an MCP HTTP server will:

Accept POST requests with JSON-RPC 2.0

Stream responses as text/event-stream

Support standard MCP methods:

initialize (sometimes implicit)
tools/list
tools/call
resources/list (optional)
prompts/list (optional)

That’s all we rely on.

1️⃣ Open a generic MCP stream

This is the universal way to connect.

```bash
curl -N http://MCP_SERVER_URL \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json"
```

If the server is alive, you’ll usually see something like:

event: ready
data: {"jsonrpc":"2.0","method":"server/ready"}

(Some servers skip ready; that’s okay.)

2️⃣ (Optional) Initialize the client

Some MCP servers expect an explicit initialize.

```bash
curl -N http://MCP_SERVER_URL \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "init-1",
    "method": "initialize",
    "params": {
      "clientInfo": {
        "name": "curl-mcp-client",
        "version": "0.1"
      }
    }
  }'
```

Typical response:

```json
{
  "jsonrpc":"2.0",
  "id":"init-1",
  "result":{
    "capabilities":{
      "tools":true
    }
  }
}
```

3️⃣ List tools (universally supported)
```bash
curl -N http://MCP_SERVER_URL \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "tools-1",
    "method": "tools/list"
  }'
```

Response:
```json
{
  "jsonrpc":"2.0",
  "id":"tools-1",
  "result":{
    "tools":[
      {
        "name":"example.search",
        "description":"Search something",
        "inputSchema":{...}
      }
    ]
  }
}
```
4️⃣ Call a tool (generic invocation)
```bash
curl -N http://MCP_SERVER_URL \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "call-1",
    "method": "tools/call",
    "params": {
      "name": "example.search",
      "arguments": {
        "query": "hello world"
      }
    }
  }'
```

Streamed result:
```json
{
  "jsonrpc":"2.0",
  "id":"call-1",
  "result":{
    "content":[
      { "type":"text", "text":"Result here" }
    ]
  }
}
```
5️⃣ Handling streaming correctly (important)

MCP servers may emit:
partial messages
multiple content chunks
a final done event

Always:
curl -N

And treat each data: line as incremental.

6️⃣ Minimal MCP client mental model

You only need to implement:

POST JSON-RPC
↓
Read SSE lines
↓
Parse JSON
↓
Match `id`
↓
Handle result/error

7️⃣ One-liner MCP request template

Save this mentally:
```bash
curl -N MCP_URL \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":"X",
    "method":"METHOD",
    "params":{...}
  }'
```
If a server requires auth, headers are just decoration on top of this.

**Step 3.3 - List Available Tools:**
Query the MCP server to discover which tools are now available (e.g., `whoami`, `list_contacts`, `query`, etc.). This confirms authentication succeeded.

**Step 3.4 - Execute the User's Original Request:**
NOW use the appropriate tool(s) to fulfill what the user actually asked for. For example:
- If they asked "who am I in HubSpot?", call the `whoami` tool and display the result
- If they asked "list my contacts", call the `list_contacts` tool and show the contacts
- If they asked "create a contact", call the appropriate creation tool

**This step completes the task** - not Step 3.2 or 3.3. The user should see their requested data, not status messages about connections.

---

## Bundled Scripts

### scripts/check-auth.cjs
Checks Nango authentication status and initiates the authentication flow if needed.

**Usage:**
`node check-auth.cjs <provider> <secret_key>`

**Output:** JSON with `status` (success, needs_auth, error) and relevant data.

### scripts/config-helper.cjs
Utility to help generate configuration snippets for various agent platforms.

### scripts/connect-direct.cjs
Reference script showing how to programmatically connect to the Nango MCP server in a one-off manner.

**When to Use:**
- For agents that support creating MCP client connections programmatically using the MCP SDK
- When you need a direct connection without configuration file setup
- As a reference implementation for custom agent integrations
- When the agent doesn't know how to add MCP servers on the fly via configuration

**Requirements:**
- `@modelcontextprotocol/sdk` package installed
- Node.js 18+
- Environment variables from authentication step

**Usage:**
```bash
# Set required environment variables
export NANGO_SECRET_KEY="your-secret-key"
export CONNECTION_ID="connection-id-from-check-auth"
export INTEGRATION_ID="hubspot"  # or other provider

# Run the script
node connect-direct.cjs
```

**Environment Variables:**
- `NANGO_SECRET_KEY` or `NANGO_SECRET_KEY_DEV` (required): Your Nango secret key
- `CONNECTION_ID` (required): The connection ID from OAuth (obtain via `check-auth.cjs`)
- `INTEGRATION_ID` or `PROVIDER_CONFIG_KEY` (required): Provider name (e.g., 'hubspot', 'salesforce')
- `NANGO_MCP_URL` (optional): MCP server URL (defaults to 'https://api.nango.dev/mcp')

**Output:** JSON to stdout with connection status and available tools

**Note:** This is a reference implementation using ES modules. Agents should adapt this pattern to their specific runtime environment and requirements. The script demonstrates the core connection pattern that can be integrated into agent workflows.

---

## Troubleshooting

- **HTTP 400 Bad Request**: This usually means the `connection-id` header is wrong. Verify you are using the `connectionId` from `check-auth.cjs` output, NOT `NANGO_DEFAULT_USER_ID`. The connection-id should look like `hubspot-abc123`, not an email address.
- **Authentication failed**: Verify the `NANGO_SECRET_KEY` and ensure the provider is configured in your Nango account.
- **Tools not appearing**: Ensure the headers are correctly sent during the MCP connection handshake.
- **Connection-id not found**: The user may need to complete the authentication flow via the provided `authUrl`.
- **Using wrong connection-id**: If you used an email address (like `user@example.com`) as the `connection-id`, that's incorrect. Re-run `check-auth.cjs` and use the `connectionId` field from the JSON output.
