---
name: hubspot-whoami-nango
description: Find out who you are in HubSpot using Nango.
version: 2.1.0
author: agent-skills-workbench
mcp-servers: ["nango-mcp-server"]
allowed-tools: [whoami]
tags: [hubspot, nango, identity, portable, self-contained]
---

# HubSpot WhoAmI via Nango

This skill identifies the current authenticated HubSpot user using the Nango integration.

## Prerequisites

- Nango MCP server access
- HubSpot integration configured in Nango
- `NANGO_SECRET_KEY` environment variable (if using bundled scripts)

## MCP Server Requirements

This skill depends on the **Nango** MCP server being correctly configured and connected.

**Required Tool:**
- `whoami`: Returns the authenticated HubSpot user's ID and email address.

**Reference MCP Server:**
- Transport: HTTP
- URL: `https://api.nango.dev/mcp`
- Auth: API key (header: `Provider-Config-Key`)

If you have your own Nango MCP server configured locally, use that instead.

**Nango Connection Setup**:
This skill is self-contained and includes instructions for connecting to Nango.

**Required Headers for MCP Connection:**
- `Authorization`: `Bearer <NANGO_SECRET_KEY>`
- `connection-id`: `<connectionId from check-auth.cjs>`
- `provider-config-key`: `hubspot`

**⚠️ CRITICAL - Connection ID Warning**:
The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs`, NOT the `NANGO_DEFAULT_USER_ID` (email address). Using an email as the connection-id will result in HTTP 400 errors.

Example: If check-auth.cjs returns `{"connectionId": "hubspot-abc123"}`, use `hubspot-abc123` as the connection-id header value

---

## Workflow

**GOAL**: Retrieve and display the authenticated HubSpot user's identity (ID and email). The connection to Nango is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tool: `whoami`.

Check if this tool is available in your current execution context before proceeding.

**Tool already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tool NOT available, but you can connect to MCP servers?**
Connect to the Nango MCP server with header-based authentication:
- URL: `https://api.nango.dev/mcp`
- Auth Type: Header-based
- Required headers:
  - `Authorization: Bearer <NANGO_SECRET_KEY>`
  - `connection-id: <connectionId from check-auth.cjs>`
  - `provider-config-key: hubspot`
- To obtain `connectionId`, run `check-auth.cjs hubspot` (see bundled scripts)
Once connected, the `whoami` tool will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Nango MCP server to your agent's MCP configuration:
- Server URL: `https://api.nango.dev/mcp`
- Auth headers as documented above
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: Call the whoami Tool
Execute the `whoami` tool provided by the Nango MCP server. This tool requires no arguments if the connection headers were correctly set during MCP initialization.

**Expected output**: A JSON response containing the user's HubSpot ID and email address.

**What success looks like**:
```json
{
  "userId": "3768092",
  "email": "user@example.com"
}
```

If the tool call fails with authentication errors, the connection was not properly established.

### Step 3: Present the Identity
Display the returned user information (ID and email) to the user in a friendly format. THIS is the completion of the task, not the connection step.

---

## Bundled Scripts

### check-auth.cjs

**Purpose**: Checks if a user is authenticated with Nango for the HubSpot integration.

**Usage**:
```bash
NANGO_SECRET_KEY=your_key node scripts/check-auth.cjs hubspot
```

**Environment Variables**:
- `NANGO_SECRET_KEY` (required): Your Nango secret key
- `NANGO_DEFAULT_USER_ID` (optional): User ID to check, defaults to 'default-user'
- `NANGO_HOST` (optional): Nango API host, defaults to 'https://api.nango.dev'

**Output**: JSON response with authentication status, connectionId (if authenticated), or authUrl (if authentication needed).

---

## Example Output

```text
HubSpot Identity:
- User ID: 3768092
- Email: email@example.com
```

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the Nango MCP server is connected and the provider is `hubspot`.
- **Authentication Error**: Refer to the troubleshooting section of the `connect-to-nango-mcp` skill.
- **Provider Mismatch**: Ensure you are using the `hubspot` provider config key when connecting to Nango.
- **Empty Response**: The `whoami` tool may return an empty response if the HubSpot token doesn't have the correct scopes. Ensure the connection was created with proper OAuth scopes.
- **Connection Failed**: Verify that `https://api.nango.dev/mcp` is accessible and the `Provider-Config-Key` header is correctly set to `hubspot`.

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use the `connect-to-nango-mcp` skill to dynamically connect
2. The connection persists for the session duration
3. Headers are automatically included in all tool calls

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the Nango MCP server to your agent's MCP configuration
2. Include the `Provider-Config-Key: hubspot` header in the server config
3. Restart the agent to apply the configuration
4. The `whoami` tool will be immediately available
