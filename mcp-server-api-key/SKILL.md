---
name: mcp-server-api-key
description: Handles API key authentication for MCP servers that require header-based authentication.
version: 3.0.0
author: agent-skills-workbench
mcp-servers: []
tags: [api-key, mcp, authentication, headers, portable]
---

# MCP Server API Key Authentication

This skill explains how to authenticate with MCP servers that use API keys or custom headers instead of OAuth.

## When to Use This Skill

Use this skill when an MCP server requires authentication but doesn't support OAuth. This typically manifests when a connection attempt returns a requirement for an "api-key" or specific headers.

---

## Workflow

### Step 1: Identify Required Header
Determine which header name the server expects for its API key. Common names include:
- `x-api-key`
- `Authorization` (typically used as `Bearer <token>`)
- `api-key`

### Step 2: Proactively Obtain the Key
Before asking the user, check the environment for any existing credentials or identifiers. If a required value is available in the environment, use it immediately. Search for common variable names or related configuration.

If the key is NOT found in the environment, ask the user for the value. If it's a Bearer token, the user provides the token, and you should ensure the "Bearer " prefix is included in the final header value if required by the server.

### Step 3: Store and Configure
Store the API key/header mapping in your agent's credential store. Once stored, configure the MCP connection to include this header in its requests.

### Step 4: Verify Connection
Retry the connection to the MCP server. If correctly configured, the connection should succeed, and tools will become available.

---

## Example Flow

1. **Agent**: Attempts to connect to `memory-server`.
2. **Server**: Responds that it requires an `x-api-key`.
3. **Agent**: "The `memory-server` requires an API key. Please provide the value for the `x-api-key` header."
4. **User**: Provides the key.
5. **Agent**: Stores the key and retries the connection.
6. **Agent**: "Connected! Tools available: ..."

---

## Key Points

- **Persistence**: Once stored, the credentials should persist across sessions.
- **Security**: Credentials should be handled and stored securely by the agent platform.
- **Header Selection**: If the server documentation is unclear, `x-api-key` is the most common default.

## Troubleshooting

- **Still getting unauthorized**: Verify the header name matches exactly and the value is correct.
- **Expired token**: Ask the user for a fresh API key and update the stored credentials.
