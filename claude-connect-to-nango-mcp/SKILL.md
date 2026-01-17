---
name: Nango MCP Integration
description: Connect agents to external platforms (HubSpot, Salesforce, etc.) via Nango OAuth and MCP.
allowed-tools: []
mcp-servers: ["nango"]
version: 6.0.0
author: Antigravity
tags: [nango, mcp, oauth, integration, hubspot, salesforce, portable]
---

# Nango MCP Integration Skill

This skill enables agents to connect to third-party SaaS platforms (HubSpot, Salesforce, etc.) through Nango's OAuth proxy and MCP server.

## Architecture Note

**IMPORTANT:** The Nango MCP server requires authentication headers (`Authorization`, `connection-id`, `provider-config-key`) at **connection time** (when the agent session starts), not during the session.

**For most agents** (including Claude Code), this follows a **two-phase bootstrap pattern**:

1. **Bootstrap Phase**: Get credentials → Store them → Generate config → User restarts
2. **Connected Phase**: Use MCP tools normally

**For agents with dynamic MCP support**, configuration may be simpler - consult your agent's capabilities.

## Prerequisites

**Environment Variables:**
- `NANGO_SECRET_KEY` (required): Your Nango secret key from nango.dev
- `NANGO_DEFAULT_USER_ID` (optional): User ID for connections, defaults to 'default-user'

**Runtime:** Node.js 18+ (for the bundled scripts)

**Agent Requirements:**
- Ability to execute bash commands (for Node.js scripts)
- MCP server support (HTTP transport)
- Either: Config file access + restart capability OR dynamic MCP configuration

## Workflow

### Phase 1: Check MCP Connection Status

**First, determine if Nango MCP tools are available:**

Try to list or use any Nango MCP tool. If they're **not available**, proceed to Bootstrap Mode below.

If tools **are available**, skip to Phase 2 (Normal Usage).

---

### Bootstrap Mode (First-Time Setup)

When Nango MCP tools are not available, follow these steps:

#### Step 0: Determine Agent Capabilities (Optional for Claude Code)

**For agents other than Claude Code:**
Check if your agent supports:
- Dynamic MCP server configuration (can add MCP servers during session)
- If YES: Skip credential storage (Steps 4-5) and proceed directly with connection details in Step 6
- If NO: Continue with all steps below

**For Claude Code:**
Continue with Step 1 (requires config file + restart pattern)

#### Step 1: Determine the Provider

Ask the user which provider they want to connect to:
- `hubspot` - HubSpot CRM
- `salesforce` - Salesforce
- Other providers configured in their Nango account

#### Step 2: Run Authentication

Execute the bundled script to check/initiate authentication:

```bash
node <skill-path>/scripts/check-auth.js <provider>
```

**Example:** `node scripts/check-auth.js hubspot`

#### Step 3: Handle Script Output

The script outputs JSON to stdout:

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
→ Present the `authUrl` to the user as a clickable link
→ Wait for user to complete OAuth flow
→ Re-run the script to get the `connectionId`

**If error:**
```json
{
  "status": "error",
  "message": "NANGO_SECRET_KEY environment variable is required"
}
```
→ Report the error to the user

#### Step 4: Store Credentials

**Option A: File-based storage (for agents requiring restart)**

If your agent requires MCP configuration via config file (like Claude Code), save credentials:

```bash
node <skill-path>/scripts/config-helper.js save '{
  "secret_key": "<value from NANGO_SECRET_KEY env var>",
  "connection_id": "<connectionId from check-auth.js>",
  "provider_config_key": "<provider>",
  "updated_at": "<current ISO timestamp>"
}'
```

Storage location: `~/.nango-mcp/credentials.json`

**Option B: Dynamic configuration (for agents supporting runtime MCP)**

If your agent can add MCP servers dynamically during the session, you may be able to configure the Nango MCP server directly without file storage. Check your agent's MCP capabilities and skip to Step 6 for connection details.

#### Step 5: Generate MCP Config

Generate the configuration snippet:

```bash
node <skill-path>/scripts/config-helper.js generate
```

This outputs the MCP server configuration in the correct format.

#### Step 6: Provide Configuration Instructions

Give the user clear instructions based on their agent type. Use the config snippet generated in Step 5.

**Universal MCP Configuration Format:**

```json
{
  "type": "http",
  "url": "https://api.nango.dev/mcp",
  "headers": {
    "Authorization": "Bearer <NANGO_SECRET_KEY>",
    "connection-id": "<CONNECTION_ID_FROM_AUTH>",
    "provider-config-key": "<PROVIDER_NAME>"
  }
}
```

**For Claude Code and similar file-based agents:**

Claude Code requires MCP configuration in a config file and a restart. Provide these instructions:

```
✅ Nango authentication successful for <provider>!

To complete the connection:

1. Add the Nango MCP server to your MCP configuration.

   For Claude Code specifically:
   - Read your existing ~/.claude.json file
   - Merge the following into the "mcpServers" section:

   <paste the generated config from Step 5>

   - Use jq for safe merging:
     jq '.mcpServers.nango = <config>' ~/.claude.json > ~/.claude.json.tmp && mv ~/.claude.json.tmp ~/.claude.json

2. Restart your coding agent session

Credentials saved to: ~/.nango-mcp/credentials.json
```

**Note for Claude Code:**
- The correct location is `~/.claude.json` (user-wide MCP config)
- Alternative is `.mcp.json` in project root (project-specific MCP config)
- You should READ the existing file first, then MERGE the mcpServers config into it
- DO NOT modify `~/.claude/settings.json` - that is NOT used for MCP server configuration
- The user **must restart** after updating the config

**For agents with dynamic MCP support:**

If your agent supports adding MCP servers during a session, provide the connection details from Step 3 directly:
- URL: `https://api.nango.dev/mcp`
- Type: `HTTP`
- Headers:
  - `Authorization`: Bearer `<secret_key>`
  - `connection-id`: `<connection_id>`
  - `provider-config-key`: `<provider>`

The agent should be able to connect immediately without restart.

**For other agents:**

Consult your agent's documentation for MCP server configuration. The required configuration format is shown above (Universal MCP Configuration Format). Common locations:
- Cline: MCP settings in VS Code settings
- Other agents: Check your agent's MCP documentation

Most agents require a restart after configuration changes.

---

### Phase 2: Normal Usage

Once the user has:
1. Updated their MCP config with the headers
2. Restarted their agent session

The Nango MCP tools will be available. You can now:

**Use provider-specific tools:**
- HubSpot: `whoami`, `list_contacts`, `create_contact`, `query`
- Salesforce: `query`, `create_record`, `whoami`
- Other providers: Check available tools

**Example usage:**
```
Call the whoami tool to check the connected account
```

The MCP server will automatically include the authentication headers from the config.

## Re-authentication

If credentials expire or the user wants to connect to a different provider:

1. Run check-auth.js again for the new provider
2. Update stored credentials (config-helper.js save)
3. Regenerate config (config-helper.js generate)
4. User updates their MCP config and restarts

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

**Outputs:** JSON to stdout (see Bootstrap Mode Step 3)

### scripts/config-helper.js

Manages credential storage and MCP config generation.

**Usage:**
```bash
# Save credentials
node config-helper.js save '{"secret_key":"...","connection_id":"...","provider_config_key":"..."}'

# Generate MCP config
node config-helper.js generate

# Get stored credentials
node config-helper.js read
```

**Storage Location:** `~/.nango-mcp/credentials.json`

## Best Practices

1. **Always check MCP tool availability first** - Don't assume connection
2. **Store credentials securely** - Use the config-helper script
3. **Handle auth expiry gracefully** - Re-run check-auth if needed
4. **Clear user instructions** - Always show config snippet and restart instructions
5. **Detect agent type** - Show appropriate config file path for user's agent

## Troubleshooting

**"MCP tools still not available after restart"**
→ Check that the config JSON syntax is valid
→ Verify headers are exactly: `Authorization`, `connection-id`, `provider-config-key`

**"NANGO_SECRET_KEY environment variable is required"**
→ User needs to set this env var before running the agent

**"Authentication failed"**
→ Check that the secret key is valid in nango.dev dashboard
→ Verify the provider is configured in the Nango account

**"Connection-id not found"**
→ User may need to complete OAuth flow via the authUrl
→ Re-run check-auth.js after OAuth completion
