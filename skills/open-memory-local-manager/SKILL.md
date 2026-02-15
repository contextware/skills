---
name: open-memory-local-manager
description: >-
  Advanced skill for managing memories in OpenMemory Local. Provides automated
  connectivity verification, search, and storage patterns.
version: 2.0.0
mcp-servers:
  - open-memory-local
allowed-tools:
  - open-memory-local_openmemory_store
  - open-memory-local_openmemory_list
  - open-memory-local_openmemory_query
tags: [memory, local, mcp, search]
---

# OpenMemory Local Manager

This skill provides a robust workflow for interacting with an `open-memory_local` MCP server. It includes patterns for connectivity health checks, semantic search, and structured memory storage.

## MCP Server Requirements

This skill requires the **open-memory-local** MCP server.

**Connection Details:**
- **URL**: Typically `http://localhost:8082/mcp`
- **Transport**: HTTP with server-sent events (SSE) support.

### Authentication (Static Header)

> [!IMPORTANT]
> This server uses **Static Header Authentication** (API Key). It does **NOT** use OAuth2.
>
> **Instruction for Agent:**
> 1.  **Ignore OAuth**: Even if the platform suggests OAuth or returns `requires_oauth_config`, **do not** ask the user for a Client ID, Client Secret, or Redirect URI.
> 2.  **Request API Key**: Always ask the user for their `x-api-key`.
> 3.  **Store Credentials**: Use the `store_api_key_credentials` tool with headers: `{ "x-api-key": "[KEY]" }`.
> 4.  **Connect**: Call `connect_to_mcp_server` only after storing the key.

**Required Header:**
```
x-api-key: [YOUR_API_KEY]
```

**Header Compatibility:**
When calling this server directly, clients **must** include the following headers for compatibility with the SSE transport:
```
Accept: application/json, text/event-stream
x-api-key: [YOUR_API_KEY]
```

## Workflow

### Phase 1: Connectivity & Auth Verification

Before performing operations, verify the server is accessible and the API key is valid.

1.  **Check Connection**: Use the bundled `scripts/check-connection.cjs` script.
    - **Usage**: `node scripts/check-connection.cjs <URL> --api-key=<KEY>`
    - **Note**: If you don't have an API key yet, ask the user for it first. **Do not attempt OAuth.**
2.  **Handle Response**:
    - `status: success`: Proceed to Phase 2.
    - `error: authentication_required`: Ask the user for the correct `x-api-key`. Do not offer OAuth as an alternative.
    - `status: error`: Verify the local service is running on the specified port. If using a gateway URL (e.g., mcpgateway.online), ensure the URL is correct.

### Phase 2: Memory Operations

#### Searching Memories
Use `openmemory_query` for semantic search.
- **When to use**: When the user asks "What do I know about X?" or "Find memories related to Y".
- **Parameters**: Use a descriptive `query` string. Setting `k` (limit) is recommended for large datasets.

#### Listing Recent Memories
Use `openmemory_list` for a broad overview.
- **When to use**: When the user asks "Show my recent memories" or "What is in my memory?".

#### Storing Memories
Use `openmemory_store` to persist new facts.
- **Best Practice**: Include `tags` (array of strings) to help with later categorization.
- **Metadata**: Use the `metadata` object to store source information (e.g., `content_type: "conversation"`) if available.

## Platform Adaptation Notes

> [!NOTE]
> Different agent platforms handle the SSE (Server-Sent Events) transport differently. 

### For Agents with Direct HTTP Access
Always ensure the `Accept` header includes `text/event-stream`. The server may fail if only `application/json` is requested.

### For Agents with Global MCP Config
Ensure the `x-api-key` is injected into the server's environment or configuration.

## Bundled Scripts

### scripts/check-connection.cjs

A portable Node.js script to verify the MCP server health.

**Input**:
- URL (positional)
- `--api-key` (optional flag)

**Output**: JSON with `status` and `serverInfo`.

---

## Troubleshooting

**"API key required" / Authentication Error**
→ The server requires the `x-api-key` header. Provision this from the environment or ask the user.

**"Not Acceptable" / Header Error**
→ The server requires the `Accept: text/event-stream` header. Ensure your transport layer is configured correctly.

**"Connection timed out"**
→ The local server at `localhost:8082` (or your configured port) is likely not running or blocked by a firewall.

