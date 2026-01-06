---
name: Nango MCP Integration
description: Connect agents to external platforms (HubSpot, Salesforce, etc.) via Nango OAuth and MCP.
allowed-tools: []
mcp-servers: ["nango"]
version: 4.0.0
author: Antigravity
tags: [nango, mcp, oauth, integration, hubspot, salesforce]
---

# Nango MCP Integration Skill

This skill enables agents to connect to third-party SaaS platforms (HubSpot, Salesforce, etc.) through Nango's OAuth proxy and MCP server.

## Overview

Nango is an OAuth proxy that handles authentication with third-party services. This skill provides:
1. A method to check/obtain authentication for a provider
2. Instructions for making authenticated API calls via the Nango MCP server

## Prerequisites

**Environment Variables (provided by your agent platform):**
- `NANGO_SECRET_KEY` (required): Your Nango secret key
- `NANGO_DEFAULT_USER_ID` (optional): User ID for connections, defaults to 'default-user'

**Runtime:** Node.js 18+ (for the bundled scripts)

## Workflow

### Step 1: Determine the Provider

Ask the user which provider they want to connect to:
- `hubspot` - HubSpot CRM
- `salesforce` - Salesforce
- Other providers configured in your Nango account

### Step 2: Check Authentication Status

Run the bundled script `scripts/check-auth.js` with the provider name:

```
check-auth.js <provider>
```

**Example:** `check-auth.js hubspot`

### Step 3: Handle the Script Output

The script outputs JSON to stdout:

**If already authenticated:**
```json
{
  "status": "success",
  "connectionId": "abc123",
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

### Step 4: Make Authenticated API Calls

Once you have the `connectionId`, call Nango MCP tools with these headers:
- `providerConfigKey`: The provider name (e.g., "hubspot")
- `connectionId`: The value from Step 3

Available tools depend on the provider. Common examples:
- HubSpot: `whoami`, `list_contacts`, `create_contact`
- Salesforce: `query`, `create_record`

## Best Practices

1. **Don't hardcode connectionIds** - Always check authentication dynamically
2. **Cache the connectionId** - Store it in session memory to avoid repeated auth checks
3. **Handle auth expiry** - If API calls fail with auth errors, re-run the check script
4. **Discover available tools** - Each provider exposes different MCP tools

## Bundled Scripts

### scripts/check-auth.js

Self-contained Node.js script that checks Nango authentication status.

**Inputs:**
- Argument 1: Provider/integration ID (e.g., "hubspot", "salesforce")
- Defaults to "hubspot" if not specified

**Outputs:** JSON to stdout (see Step 3 above)

**Environment Variables Used:**
- `NANGO_SECRET_KEY` (required)
- `NANGO_DEFAULT_USER_ID` (optional, defaults to 'default-user')
- `NANGO_HOST` (optional, defaults to 'https://api.nango.dev')

**Characteristics:**
- Self-contained: No npm dependencies, uses Node.js built-in `fetch`
- Portable: Works on any Node.js 18+ environment
