---
name: connect-to-nango-mcp
description: Connect agents to external platforms (HubSpot, Salesforce, etc.) via Nango OAuth and MCP.
version: 7.1.0
author: context-serve
mcp-servers: ["nango"]
tags: [nango, mcp, oauth, integration, hubspot, salesforce, portable]
---

# Nango MCP Integration Skill

This skill enables agents to connect to third-party SaaS platforms (HubSpot, Salesforce, etc.) through Nango's OAuth proxy and MCP server.

## Prerequisites

### Environment Variables
- `NANGO_SECRET_KEY` (required): Your Nango secret key from nango.dev
- `NANGO_DEFAULT_USER_ID` (optional): User ID for connections, defaults to 'default-user'

### Runtime
- Node.js 18+ (for bundled scripts using built-in fetch)

### MCP Server Dependency

This skill requires the **Nango** MCP server.

**Server Details:**
- Transport: HTTP
- URL: `https://api.nango.dev/mcp`

**Required Headers (at connection time):**
- `Authorization`: Bearer <secret_key>
- `connection-id`: <connection_id from OAuth>
- `provider-config-key`: <provider name>

**Available Tools (vary by provider):**
- HubSpot: `whoami`, `list_contacts`, `create_contact`, `query`
- Salesforce: `query`, `create_record`, `whoami`

> [!IMPORTANT]
> The Nango MCP server requires authentication headers at **connection time** 
> (when the agent session starts), not during the session. This means most agents 
> need a bootstrap phase before the MCP tools become available.

---

## Workflow

### Phase 1: Check MCP Connection Status

First, determine if Nango MCP tools are available by trying to list or use any Nango tool.

**If tools are available:** Skip to Phase 3 (Normal Usage).

**If tools are not available:** Proceed to Phase 2 (Bootstrap Mode).

---

### Phase 2: Bootstrap Mode (First-Time Setup)

When Nango MCP tools are not available, follow these steps:

#### Step 1: Determine the Provider

Ask the user which provider they want to connect to:
- `hubspot` - HubSpot CRM
- `salesforce` - Salesforce
- Other providers configured in their Nango account

#### Step 2: Run Authentication Script

Execute the bundled authentication script with the provider name:

```bash
node <skill-path>/scripts/check-auth.js <provider>
```

**Example:** `node scripts/check-auth.js hubspot`

#### Step 3: Handle Script Output

The script outputs JSON to stdout with one of three statuses:

**If already authenticated:**
```json
{
  "status": "success",
  "connectionId": "f9a3f9ee-223d-42cd-8aa0-714b4d5183d2",
  "integrationId": "hubspot",
  "endUserId": "default-user"
}
```
→ Proceed to Step 4 with the `connectionId`

**If authentication needed:**
```json
{
  "status": "needs_auth",
  "authUrl": "https://connect.nango.dev/?session_token=...",
  "message": "Please authenticate by visiting the URL above."
}
```

> [!CRITICAL]
> **STOP EXECUTION HERE!** Do not automatically retry or loop.

**Agent instructions for `needs_auth` status:**

1. **Present the `authUrl` ONCE** as a clickable link to the user:
   > "Please authenticate by visiting this link: [authUrl]"

2. **STOP and explicitly ASK the user to confirm** when they have completed authentication:
   > "Please let me know when you've completed the OAuth authentication."

3. **DO NOT:**
   - ❌ Automatically re-run the auth check script
   - ❌ Poll or loop waiting for authentication to complete
   - ❌ Present the auth URL multiple times

4. **ONLY after the user confirms** they have authenticated:
   - Re-run the `check-auth.js` script to get the `connectionId`
   - If the result is still `needs_auth`, inform the user that authentication wasn't successful and present the new URL once

**If error:**
```json
{
  "status": "error",
  "message": "NANGO_SECRET_KEY environment variable is required"
}
```
→ Report the error to the user

#### Step 4: Store Credentials (If Needed)

For agents that require persistent credential storage, save the credentials:

```bash
node <skill-path>/scripts/config-helper.js save '{
  "secret_key": "<value from NANGO_SECRET_KEY env var>",
  "connection_id": "<connectionId from check-auth.js>",
  "provider_config_key": "<provider>",
  "updated_at": "<current ISO timestamp>"
}'
```

Storage location: `~/.nango-mcp/credentials.json`

#### Step 5: Generate MCP Configuration

Generate the MCP server configuration:

```bash
node <skill-path>/scripts/config-helper.js generate
```

This outputs the configuration in a standard format that can be adapted to any agent.

#### Step 6: Provide Configuration Instructions

Present the user with the MCP configuration and explain they need to add it to their agent's MCP settings.

**Universal MCP Configuration Format:**
```json
{
  "nango": {
    "type": "http",
    "url": "https://api.nango.dev/mcp",
    "headers": {
      "Authorization": "Bearer <NANGO_SECRET_KEY>",
      "connection-id": "<CONNECTION_ID>",
      "provider-config-key": "<PROVIDER_NAME>"
    }
  }
}
```

---

### Phase 3: Normal Usage

Once the MCP server is connected, the Nango tools become available:

**Use provider-specific tools:**
- HubSpot: `whoami`, `list_contacts`, `create_contact`, `query`
- Salesforce: `query`, `create_record`, `whoami`
- Other providers: Check available tools

**Example:**
```
Call the whoami tool to check the connected account
```

---

## Platform Adaptation Notes

> [!NOTE]
> Different agents handle MCP configuration differently. This section provides 
> hints for common patterns - agents should match their capabilities.

### Dynamic MCP Support

For agents that can add MCP servers during a session:
- Skip credential storage (Steps 4-5)
- Use the connection details from Step 3 directly
- Connect immediately without restart

**Connection Details:**
- URL: `https://api.nango.dev/mcp`
- Type: HTTP
- Headers: Authorization, connection-id, provider-config-key (from auth step)

### Static MCP Configuration

For agents requiring config file + restart (most common):

1. **Save credentials** - Use the config-helper script to persist credentials
2. **Generate config** - Get the MCP configuration snippet
3. **Merge into agent config** - Add the `nango` entry to the agent's `mcpServers` section
4. **Restart session** - User must restart for the MCP server to connect

Common config file locations vary by agent - the agent should know its own config path.

### Script Execution

Scripts are self-contained Node.js (18+) files that:
- Accept input via command-line arguments and environment variables
- Output JSON to stdout
- Use only built-in `fetch` (no external dependencies)

---

## Bundled Scripts

### scripts/check-auth.js

Checks Nango authentication status and initiates OAuth if needed.

**Usage:**
```bash
node check-auth.js <provider>
```

**Inputs:**
- Argument 1: Provider/integration ID (e.g., "hubspot", "salesforce")
- Defaults to "hubspot" if not specified

**Environment Variables:**
- `NANGO_SECRET_KEY` (required)
- `NANGO_DEFAULT_USER_ID` (optional, defaults to 'default-user')
- `NANGO_HOST` (optional, defaults to 'https://api.nango.dev')

**Output:** JSON to stdout (see Phase 2, Step 3)

---

### scripts/config-helper.js

Manages credential storage and MCP configuration generation.

**Usage:**
```bash
# Save credentials
node config-helper.js save '{"secret_key":"...","connection_id":"...","provider_config_key":"..."}'

# Generate MCP config
node config-helper.js generate

# Read stored credentials
node config-helper.js read

# Get full setup instructions
node config-helper.js instructions
```

**Storage Location:** `~/.nango-mcp/credentials.json`

---

## Re-authentication

If credentials expire or the user wants to connect to a different provider:

1. Run `check-auth.js` again for the new provider
2. Update stored credentials (`config-helper.js save`)
3. Regenerate config (`config-helper.js generate`)
4. User updates their MCP config and restarts (if static configuration)

---

## Troubleshooting

**"MCP tools still not available after restart"**
→ Check that the config JSON syntax is valid
→ Verify headers are exactly: `Authorization`, `connection-id`, `provider-config-key`
→ Check the agent's config file location

**"NANGO_SECRET_KEY environment variable is required"**
→ User needs to set this env var before running the agent

**"Authentication failed"**
→ Check that the secret key is valid in nango.dev dashboard
→ Verify the provider is configured in the Nango account

**"Connection-id not found"**
→ User may need to complete OAuth flow via the authUrl
→ Re-run check-auth.js after OAuth completion
