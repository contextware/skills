---
name: memory-management
description: Manage persistent memories with OpenMemory Local. Provides semantic search, storage, and memory organization across sessions.
version: 2.1.0
author: agent-skills-workbench
mcp-servers: [open-memory-local]
allowed-tools: [openmemory_store, openmemory_list, openmemory_query, openmemory_delete, openmemory_get]
tags: [memory, local, semantic-search, portable]
---

# Memory Management

This skill provides robust memory management through the OpenMemory Local MCP server. It enables persistent storage, semantic search, and organization of memories across sessions with support for sectors and user-based isolation.

## Prerequisites

- OpenMemory Local server running locally or accessible via URL
- API key for authentication (x-api-key)
- Node.js 18+ (if using bundled scripts)

## MCP Server Requirements

This skill requires the **OpenMemory Local** MCP server.

**Required Tools:**
- `openmemory_store`: Store new memories with tags and metadata
- `openmemory_list`: List all memories or filter by criteria
- `openmemory_query`: Semantic search across memories
- `openmemory_delete`: Delete specific memories by ID
- `openmemory_get`: Retrieve a specific memory by ID

**Reference MCP Server:**
- Transport: HTTP with Server-Sent Events (SSE) support
- URL: `http://localhost:8082/mcp` (default local installation)
- Auth: Static header (`x-api-key`)
- GitHub: https://github.com/Contextual-ai/open-memory-local

**Authentication**:
This server uses **Static Header Authentication** (API Key), NOT OAuth 2.0.

**Required Header:**
```
x-api-key: [YOUR_API_KEY]
```

**⚠️ IMPORTANT - Do NOT Attempt OAuth**:
Even if the platform suggests OAuth or returns `requires_oauth_config`, this server does NOT support OAuth. Always use API key authentication via the `x-api-key` header.

---

## Core Concepts

### Memory Sectors
OpenMemory Local supports **sectors** to organize memories into logical groups:
- **Default Sector**: If no sector is specified, memories go to the default sector
- **Custom Sectors**: Create custom sectors for different contexts (e.g., "work", "personal", "projects")
- **Sector Isolation**: Memories in one sector don't appear in queries to another sector
- **Use Case**: Separate work memories from personal memories, or project-specific knowledge

### User ID
The **user_id** parameter enables multi-user memory isolation:
- **Purpose**: Separate memories for different users in shared OpenMemory instances
- **Default**: If not specified, uses a default user ID
- **Use Case**: In multi-tenant environments or when managing memories for multiple personas
- **Privacy**: Each user_id has isolated memory space

### Tags and Metadata
- **Tags**: Array of strings for categorization (e.g., `["meeting", "project-alpha", "q4-2025"]`)
- **Metadata**: JSON object for structured data (e.g., `{ "source": "email", "date": "2025-12-15" }`)
- **Best Practice**: Always include tags and metadata for better searchability

---

## Workflow

**GOAL**: Store, search, and manage persistent memories. Connection verification is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `openmemory_store`, `openmemory_list`, `openmemory_query`, `openmemory_delete`, `openmemory_get`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the OpenMemory MCP server:
- URL: `https://memory-mcp.mcpgateway.online/mcp` (or local: `http://localhost:8082/mcp`)
- Auth Type: API key (if required by the server)
- To verify connection, run: `node scripts/check-connection.cjs <server-url> --api-key=<your_api_key>`
- Expected response: `status: success` means connection is valid
Once connected, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the OpenMemory MCP server to your agent's MCP configuration:
- Server URL: `https://memory-mcp.mcpgateway.online/mcp`
- Auth: API key (if required)
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: Memory Operations

#### Storing Memories

Use the `openmemory_store` tool to persist new memories.

**Required Parameters**:
- **content** (string): The memory content to store

**Optional Parameters**:
- **tags** (array of strings): Tags for categorization
- **metadata** (object): Structured metadata
- **sector** (string): Memory sector (defaults to default sector)
- **user_id** (string): User identifier for multi-user isolation

**Best Practice**: Always include tags and metadata for better organization and retrieval.

**Expected Response**:
```json
{
  "id": "mem_abc123xyz",
  "status": "stored",
  "content": "Meeting notes from Q4 planning session...",
  "tags": ["meeting", "q4-planning"],
  "sector": "work",
  "created_at": "2026-02-11T10:30:00Z"
}
```

#### Querying Memories (Semantic Search)

Use the `openmemory_query` tool for semantic search across memories.

**Required Parameters**:
- **query** (string): Natural language search query

**Optional Parameters**:
- **k** (integer): Number of results to return (default: 5, recommended for large datasets)
- **sector** (string): Limit search to specific sector
- **user_id** (string): Limit search to specific user
- **min_score** (float): Minimum similarity score (0.0 to 1.0)

**When to Use**:
- "What do I know about X?"
- "Find memories related to Y"
- "Search for information about Z"

**Expected Response**:
```json
{
  "results": [
    {
      "id": "mem_abc123",
      "content": "Project Alpha kicked off in Q3...",
      "score": 0.92,
      "tags": ["project-alpha", "kickoff"],
      "metadata": { "date": "2025-09-15" },
      "created_at": "2025-09-15T14:20:00Z"
    }
  ],
  "query": "project alpha start date",
  "count": 1
}
```

#### Listing Memories

Use the `openmemory_list` tool for a broad overview of all memories.

**Optional Parameters**:
- **limit** (integer): Maximum number of memories to return
- **offset** (integer): Pagination offset
- **sector** (string): Filter by sector
- **user_id** (string): Filter by user
- **tags** (array): Filter by tags

**When to Use**:
- "Show my recent memories"
- "What is in my memory?"
- "List all work-related memories"

**Expected Response**:
```json
{
  "memories": [
    {
      "id": "mem_xyz789",
      "content": "Remember to follow up with client...",
      "tags": ["todo", "client"],
      "created_at": "2026-02-10T16:45:00Z"
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 10
}
```

#### Retrieving a Specific Memory

Use the `openmemory_get` tool to retrieve a memory by its ID.

**Required Parameters**:
- **id** (string): The memory ID

**Optional Parameters**:
- **user_id** (string): User identifier (if using multi-user mode)

**Expected Response**:
```json
{
  "id": "mem_abc123",
  "content": "Full memory content here...",
  "tags": ["important", "reference"],
  "metadata": { "source": "research", "category": "technical" },
  "sector": "work",
  "created_at": "2026-01-15T09:30:00Z",
  "updated_at": "2026-01-16T10:15:00Z"
}
```

#### Deleting Memories

Use the `openmemory_delete` tool to remove memories.

**Required Parameters**:
- **id** (string): The memory ID to delete

**Optional Parameters**:
- **user_id** (string): User identifier (if using multi-user mode)

**Expected Response**:
```json
{
  "id": "mem_abc123",
  "status": "deleted"
}
```

---

## Bundled Scripts

### check-connection.cjs

**Purpose**: Verifies OpenMemory Local server health and authentication.

**Usage**:
```bash
node scripts/check-connection.cjs <url> --api-key=<key>
```

**Arguments**:
- `url`: MCP server URL (e.g., `http://localhost:8082/mcp`)
- `--api-key`: API key for authentication (optional flag)

**Output**: JSON with status and serverInfo.

**Example**:
```bash
node scripts/check-connection.cjs http://localhost:8082/mcp --api-key=sk_abc123
```

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use the `mcp-server-api-key` skill to handle API key authentication
2. Store credentials with headers: `{ "x-api-key": "[YOUR_KEY]" }`
3. Connect to the server URL
4. Tools will be immediately available

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the OpenMemory Local MCP server to your agent's configuration
2. Include the `x-api-key` header in server config
3. Restart the agent to apply the configuration
4. Tools will be immediately available

### SSE Transport Compatibility
The OpenMemory Local server uses Server-Sent Events (SSE) transport. Always ensure the `Accept` header includes `text/event-stream`:

```
Accept: application/json, text/event-stream
x-api-key: [YOUR_API_KEY]
```

Some agent platforms handle this automatically; others may require manual header configuration.

### Continuous Workflow Pattern
Agents should treat connection verification and memory operations as a single workflow. Only report the final result (e.g., "Stored memory with ID mem_abc123") to the user. Do not pause to say "Connection verified."

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the OpenMemory Local MCP server is connected and running
- **Authentication Required / API Key Error**: The `x-api-key` header is missing or invalid
  - Ask the user for the correct API key
  - Do NOT attempt OAuth authentication (not supported)
- **406 Not Acceptable / Header Error**: The server requires the `Accept: text/event-stream` header
  - Ensure your MCP client is configured to send this header
  - This is a transport-level issue, not an API key issue
- **Connection Refused / Timeout**: The server is not running or is blocked by a firewall
  - For localhost: Verify the service is running on port 8082 (or configured port)
  - For remote URL: Verify the URL is correct and accessible
- **Memory Not Found (404)**: The memory ID doesn't exist or belongs to a different user/sector
- **Empty Query Results**:
  - Try broader search terms
  - Check if you're searching the correct sector
  - Verify memories exist with the `openmemory_list` tool
- **Invalid Sector**: Sector names are case-sensitive. Verify the sector name is correct.
- **User Isolation Issues**: If using `user_id`, ensure you're querying with the same `user_id` used during storage

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY memory operation, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After storing a memory:
```
✓ Memory stored successfully!

ID: [memory ID]
Tags: [tags if provided]
Sector: [sector if specified]
```

After querying memories:
```
✓ Found [N] memories matching "[query]":

1. [Memory excerpt or title]
   Tags: [tags]
   Score: [similarity score]

2. [Memory excerpt or title]
   Tags: [tags]
   Score: [similarity score]
...
```

After listing memories:
```
✓ You have [N] memories:

1. [Memory excerpt]
   Created: [date]
   Tags: [tags]

2. [Memory excerpt]
   Created: [date]
   Tags: [tags]
...
```

After deleting a memory:
```
✓ Memory deleted successfully!

ID: [memory ID]
```

If no results found:
```
✗ No memories found matching "[query]".

Suggestions:
- Try broader search terms
- Check if you're searching the correct sector
- Verify memories exist with the list command
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Stored memory with ID mem_abc123"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.
