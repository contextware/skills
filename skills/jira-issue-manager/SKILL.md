---
name: jira-issue-manager
description: Manage Jira issues with automated project and issue type discovery. Create issues programmatically via Nango MCP.
version: 2.1.0
author: agent-skills-workbench
mcp-servers: [nango-mcp-server]
allowed-tools: [whoami, create_issue, list-projects, list-issue-types]
tags: [jira, nango, issues, portable, self-contained]
---

# Jira Issue Manager

This skill enables programmatic Jira issue management through the Nango MCP server. It includes automated discovery of cloud IDs, projects, and issue types—no manual dashboard lookups required.

## Prerequisites

- Nango MCP server access
- Jira integration configured in Nango
- `NANGO_SECRET_KEY` environment variable (if using bundled scripts)
- Jira Cloud instance with API access

## MCP Server Requirements

This skill requires the **Nango MCP Server** configured for the Jira provider.

**Required Tools:**
- `whoami`: To identify the current authenticated user
- `create_issue`: To create new Jira issues
- `list-projects`: To discover available Jira projects
- `list-issue-types`: To discover available issue types for a project

**Reference MCP Server:**
- Transport: HTTP
- URL: `https://api.nango.dev/mcp`
- Auth Type: **Header-based authentication**

If you have your own Nango MCP server configured locally, use that instead.

**Nango Connection Setup**:
This skill is self-contained and includes instructions for connecting to Nango.

**Authentication Type**: Header-based authentication with the following headers:
- `Authorization`: `Bearer <NANGO_SECRET_KEY>`
- `connection-id`: `<connectionId from check-auth.cjs>`
- `provider-config-key`: `jira`

**⚠️ CRITICAL - Connection ID Warning**:
The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs`, NOT the `NANGO_DEFAULT_USER_ID` (email address). Using an email as the connection-id will result in HTTP 400 errors.

**Note**: If your agent platform has its own mechanism for managing MCP server connections with header authentication, you may use that instead of the bundled scripts. The scripts are provided as portable, zero-dependency tools for platforms that need them.

---

## Workflow

**GOAL**: Create and manage Jira issues programmatically. Connection and discovery are prerequisites, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `whoami`, `create_issue`, `list-projects`, `list-issue-types`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the Nango MCP server with header-based authentication:
- URL: `https://api.nango.dev/mcp`
- Auth Type: Header-based
- Required headers:
  - `Authorization: Bearer <NANGO_SECRET_KEY>`
  - `connection-id: <connectionId from check-auth.cjs>`
  - `provider-config-key: jira`
- To obtain `connectionId`, run `check-auth.cjs jira` (see bundled scripts)
Once connected, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Nango MCP server to your agent's MCP configuration:
- Server URL: `https://api.nango.dev/mcp`
- Auth headers as documented above
- After configuration, restart the agent and retry this skill.

**⚠️ CONNECTION-ID WARNING**: The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs` (e.g., `jira-abc123`), NOT the `NANGO_DEFAULT_USER_ID` (which is typically an email address). Using an email as the connection-id will result in HTTP 400 errors.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: Discover Cloud ID (Automated)

The Jira Cloud ID is required for API calls but should NOT require manual dashboard lookups.

**Automated Discovery** (using bundled scripts):
```bash
NANGO_SECRET_KEY=your_key \
node scripts/discover-cloud-id.cjs <connectionId>
```

**What success looks like**:
```json
{
  "cloudId": "efe59576-1147-4e4b-96b5-7615e308a36b",
  "url": "https://your-domain.atlassian.net",
  "name": "Your Jira Instance"
}
```

Store the `cloudId` for use in subsequent steps.

### Step 3: Discover Projects

Before creating an issue, discover which projects are available.

**Option A - Using MCP Tool** (if available):
Call the `list-projects` tool with the discovered `cloudId`.

**Option B - Using Script**:
```bash
NANGO_SECRET_KEY=your_key \
node scripts/list-projects.cjs <cloudId> <connectionId>
```

**Expected Response**:
```json
[
  {
    "id": "10001",
    "key": "PROJ",
    "name": "My Project"
  },
  {
    "id": "10002",
    "key": "TEST",
    "name": "Test Project"
  }
]
```

Let the user select a project or use the first available project if not specified.

### Step 4: Discover Issue Types

Each project has different issue types (Bug, Story, Task, etc.). Discover them programmatically.

**Option A - Using MCP Tool** (if available):
Call the `list-issue-types` tool with `cloudId` and `projectId`.

**Option B - Using Script**:
```bash
NANGO_SECRET_KEY=your_key \
node scripts/list-issue-types.cjs <cloudId> <projectId> <connectionId>
```

**Expected Response**:
```json
[
  {
    "id": "10011",
    "name": "Story"
  },
  {
    "id": "10012",
    "name": "Bug"
  },
  {
    "id": "10013",
    "name": "Task"
  }
]
```

Let the user select an issue type or use a sensible default (e.g., "Task").

### Step 5: Create Issue

Use the `create_issue` tool with the discovered IDs.

**Required Parameters**:
- **summary** (string): Brief description of the issue
- **project** (string): Project ID from Step 3 (e.g., `"10001"`)
- **issueType** (string): Issue type ID from Step 4 (e.g., `"10011"`)

**Optional Parameters**:
- **description** (string): Detailed description of the issue
- **priority** (string): Priority name (e.g., "High", "Medium", "Low")
- **labels** (array): Array of label strings
- **assignee** (string): Assignee account ID

**Expected Response**:
```json
{
  "id": "10234",
  "key": "PROJ-42",
  "self": "https://your-domain.atlassian.net/rest/api/3/issue/10234"
}
```

---

## Bundled Scripts

All scripts use Node.js built-in `fetch` (Node 18+) with ZERO external dependencies. Secrets are passed via environment variables, never as CLI arguments.

### discover-cloud-id.cjs

**Purpose**: Discovers the Jira Cloud ID from the authenticated connection.

**Usage**:
```bash
NANGO_SECRET_KEY=your_key node scripts/discover-cloud-id.cjs <connectionId>
```

**Environment Variables**:
- `NANGO_SECRET_KEY` (required): Your Nango secret key
- `NANGO_HOST` (optional): Nango API host, defaults to 'https://api.nango.dev'

**Arguments**:
- `connectionId`: The Nango connection ID for Jira

**Output**: JSON with cloudId, url, and name.

### list-projects.cjs

**Purpose**: Lists all accessible Jira projects.

**Usage**:
```bash
NANGO_SECRET_KEY=your_key node scripts/list-projects.cjs <cloudId> <connectionId>
```

**Environment Variables**:
- `NANGO_SECRET_KEY` (required): Your Nango secret key

**Arguments**:
- `cloudId`: Jira Cloud ID from discover-cloud-id.cjs
- `connectionId`: Nango connection ID

**Output**: JSON array of projects with id, key, and name.

### list-issue-types.cjs

**Purpose**: Lists all issue types available for a specific project.

**Usage**:
```bash
NANGO_SECRET_KEY=your_key node scripts/list-issue-types.cjs <cloudId> <projectId> <connectionId>
```

**Environment Variables**:
- `NANGO_SECRET_KEY` (required): Your Nango secret key

**Arguments**:
- `cloudId`: Jira Cloud ID
- `projectId`: Project ID from list-projects.cjs
- `connectionId`: Nango connection ID

**Output**: JSON array of issue types with id and name.

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use your platform's dynamic MCP connection mechanism or the bundled scripts to connect to `https://api.nango.dev/mcp` with the required headers (see Step 1)
2. The connection persists for the session duration
3. Headers are automatically included in all tool calls
4. Use MCP tools directly if available, fall back to scripts if needed

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the Nango MCP server to your agent's MCP configuration
2. Include the `Provider-Config-Key: jira` header in the server config
3. Restart the agent to apply the configuration
4. The tools will be immediately available

### Continuous Workflow Pattern
Agents should treat connection, discovery, and issue creation as a single atomic operation. Only report the final result (e.g., "Created issue PROJ-42") to the user. Do not pause after each discovery step.

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the Nango MCP server is connected and the provider is `jira`
- **HTTP 400 Bad Request during connection**: The `connection-id` header is incorrect. Run `check-auth.cjs jira` to get the correct connectionId. Remember: use the `connectionId` field from the output, NOT the `NANGO_DEFAULT_USER_ID` (email)
- **HTTP 401 Unauthorized**: The Nango secret key is invalid or the connection has expired. Re-authenticate
- **HTTP 403 Forbidden**: The Jira token doesn't have sufficient permissions. Check OAuth scopes:
  - Required scopes: `read:jira-work`, `write:jira-work`, `read:jira-user`
- **Cloud ID Discovery Failed**: The Jira connection may not be properly authenticated. Re-run the Nango OAuth flow
- **No Projects Found**: The authenticated user may not have access to any projects. Verify permissions in Jira
- **Issue Creation Failed**:
  - Verify project ID and issue type ID are valid for the cloud instance
  - Verify required fields for the issue type (some issue types require additional custom fields)
  - Check that the summary is not empty
- **Connection ID vs User ID**: Always use the `connectionId` from Nango, NOT the user ID or email
- **Authentication Error**: Verify that all three required headers are present and correct:
  - `Authorization: Bearer <NANGO_SECRET_KEY>` - Must be a valid Nango secret key
  - `connection-id: <connectionId>` - Must be from `check-auth.cjs jira`, NOT the email/user ID
  - `provider-config-key: jira` - Must be exactly `jira`
  - If authentication fails, run `check-auth.cjs jira` to verify the connection exists and get the correct connectionId
- **Provider Mismatch**: Ensure you are using the `jira` provider config key when connecting to Nango

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY Jira operation, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After creating an issue:
```
✓ Jira issue created successfully!

Key: [issue key, e.g., PROJ-42]
ID: [issue ID]
Summary: [issue summary]
Project: [project name]
Type: [issue type name]
URL: [issue URL if available]
```

After listing projects:
```
✓ Found [N] Jira projects:

1. [KEY]: [Project Name] (ID: [id])
2. [KEY]: [Project Name] (ID: [id])
...
```

After listing issue types:
```
✓ Available issue types for [project name]:

1. [Issue Type Name] (ID: [id])
2. [Issue Type Name] (ID: [id])
...
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Created issue PROJ-42"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.
