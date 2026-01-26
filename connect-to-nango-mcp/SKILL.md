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
- `NANGO_DEFAULT_USER_ID`: The end-user identifier for the connection.

### Runtime
- Node.js 18+ (for bundled scripts using built-in fetch)

---

## Workflow

### Phase 1: Check Connection Status
First, determine if the Nango MCP server is already connected. If Nango-specific tools (like `whoami` or `list_contacts`) are already available in your environment, you can skip to normal usage.

### Phase 2: Handle Authentication
If tools are not available, you must obtain a `connectionId`.

1. **Ask the user** which provider they want to connect to (e.g., `hubspot`, `salesforce`).
2. **Run the authentication script**: Execute `scripts/check-auth.js` passing the provider and secret key.
   ```bash
   node scripts/check-auth.js <provider> <secret_key>
   ```
3. **Handle Response**:
   - **Success**: The script returns a `connectionId`. Proceed to configure the MCP server.
   - **Needs Auth**: The script returns an `authUrl`. Present this URL to the user and wait for them to confirm completion. Once confirmed, re-run the script to get the `connectionId`.
   - **Error**: Report the error to the user.

### Phase 3: Configure MCP Server
Once you have the `connectionId`, configure your MCP client to connect to `https://api.nango.dev/mcp` using the required headers:
- `Authorization`: `Bearer <NANGO_SECRET_KEY>`
- `connection-id`: `<connectionId>`
- `provider-config-key`: `<provider>`

After the connection is established, the provider-specific tools will become available.

---

## Bundled Scripts

### scripts/check-auth.js
Checks Nango authentication status and initiates the authentication flow if needed.

**Usage:**
`node check-auth.js <provider> <secret_key>`

**Output:** JSON with `status` (success, needs_auth, error) and relevant data.

### scripts/config-helper.js
Utility to help generate configuration snippets for various agent platforms.

---

## Troubleshooting

- **Authentication failed**: Verify the `NANGO_SECRET_KEY` and ensure the provider is configured in your Nango account.
- **Tools not appearing**: Ensure the headers are correctly sent during the MCP connection handshake.
- **Connection-id not found**: The user may need to complete the authentication flow via the provided `authUrl`.
