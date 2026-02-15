---
name: hubspot-task-manager
description: >-
  Manage HubSpot tasks (create, update, delete) via Nango MCP. Optimized for
  continuous execution.
version: 2.1.0
author: agent-skills-workbench
mcp-servers: [nango-mcp-server]
allowed-tools: [whoami, create-task, update-task, delete-task, fetch-account-information]
tags: [hubspot, nango, tasks, portable, self-contained]
---

# HubSpot Task Manager

A skill for managing HubSpot tasks (create, update, delete) using the Nango MCP server.

## Prerequisites

- Nango MCP server access
- HubSpot integration configured in Nango
- `NANGO_SECRET_KEY` environment variable (if using bundled scripts)

## MCP Server Requirements

This skill requires the **Nango MCP Server** configured for the HubSpot provider.

**Required Tools:**
- `whoami`: To identify the current user for task assignment
- `create-task`: To create new tasks
- `update-task`: To modify existing tasks
- `delete-task`: To remove tasks
- `fetch-account-information`: To retrieve account details

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
- `provider-config-key`: `hubspot`

**⚠️ CRITICAL - Connection ID Warning**:
The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs`, NOT the `NANGO_DEFAULT_USER_ID` (email address). Using an email as the connection-id will result in HTTP 400 errors.

**Note**: If your agent platform has its own mechanism for managing MCP server connections with header authentication, you may use that instead of the bundled scripts. The scripts are provided as portable, zero-dependency tools for platforms that need them.

---

## Workflow

**GOAL**: Manage HubSpot tasks programmatically. The connection to Nango is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `whoami`, `create-task`, `update-task`, `delete-task`, `fetch-account-information`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the Nango MCP server with header-based authentication:
- URL: `https://api.nango.dev/mcp`
- Auth Type: Header-based
- Required headers:
  - `Authorization: Bearer <NANGO_SECRET_KEY>`
  - `connection-id: <connectionId from check-auth.cjs>`
  - `provider-config-key: hubspot`
- To obtain `connectionId`, run `check-auth.cjs hubspot` (see bundled scripts)
Once connected, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Nango MCP server to your agent's MCP configuration:
- Server URL: `https://api.nango.dev/mcp`
- Auth headers as documented above
- After configuration, restart the agent and retry this skill.

**⚠️ CONNECTION-ID WARNING**: The `connection-id` header MUST be the `connectionId` returned by `check-auth.cjs` (e.g., `hubspot-abc123`), NOT the `NANGO_DEFAULT_USER_ID` (which is typically an email address). Using an email as the connection-id will result in HTTP 400 errors.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 and Step 3 without stopping or asking for permission.

### Step 2: Identify User (Assignment)
Identify the current HubSpot user ID by calling the `whoami` tool. Use this ID for the `assigned_to` field unless a different assignee is specified.

**What success looks like**:
```json
{
  "userId": "3768092",
  "email": "user@example.com"
}
```

### Step 3: Manage Tasks

#### Creating a Task
Use the `create-task` tool.

**Required Parameters**:
- **assigned_to** (string): User ID from Step 2 (e.g., `"3768092"`)
- **task_type** (string): Default to `TODO` if not specified
- **priority** (string): Default to `LOW` or `MEDIUM` if not specified
- **due_date** (string): Must be in ISO 8601 format (e.g., `2026-03-31T00:00:00Z`)
- **title** (string): A descriptive name for the task

**Expected Response**:
```json
{
  "id": "12345678901",
  "title": "Follow up with customer",
  "assigned_to": "3768092",
  "due_date": "2026-03-31T00:00:00Z",
  "task_type": "TODO",
  "priority": "MEDIUM"
}
```

#### Updating a Task
Use the `update-task` tool. You must provide the task `id`. You only need to provide the specific fields you wish to change (e.g., `due_date` or `notes`).

**Required Parameters**:
- **id** (string): The task ID to update
- Other fields as needed (partial update)

#### Deleting a Task
Use the `delete-task` tool with the task `id`.

**Required Parameters**:
- **id** (string): The task ID to delete

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

### config-helper.cjs

**Purpose**: Helper script for managing Nango configuration.

### connect-direct.cjs

**Purpose**: Direct connection helper for Nango authentication.

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use your platform's dynamic MCP connection mechanism or the bundled scripts to connect to `https://api.nango.dev/mcp` with the required headers (see Step 1)
2. The connection persists for the session duration
3. Headers are automatically included in all tool calls

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the Nango MCP server to your agent's MCP configuration
2. Include the `Provider-Config-Key: hubspot` header in the server config
3. Restart the agent to apply the configuration
4. The tools will be immediately available

### Continuous Workflow Pattern
Agents should treat the connection, identification, and task creation as a single atomic operation. Only report the final result (e.g., "Task created with ID X") to the user. Do not pause to say "I am now connected" or "I have found your user ID."

### Date Handling
Always convert natural language dates (e.g., "tomorrow at noon", "end of next month") into ISO 8601 strings before calling the tools.

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the Nango MCP server is connected and the provider is `hubspot`
- **HTTP 400 Bad Request during connection**: This means the `connection-id` header is wrong. You likely used `NANGO_DEFAULT_USER_ID` (an email) instead of the `connectionId` from `check-auth.cjs`. Re-run `check-auth.cjs` and use the `connectionId` field from the output
- **"Invalid input provided"**: Ensure all required fields (especially `assigned_to`, `task_type`, and `priority`) are present in the request
- **Authentication Error**: Verify that all three required headers are present and correct:
  - `Authorization: Bearer <NANGO_SECRET_KEY>` - Must be a valid Nango secret key
  - `connection-id: <connectionId>` - Must be from `check-auth.cjs`, NOT the email/user ID
  - `provider-config-key: hubspot` - Must be exactly `hubspot`
  - If authentication fails, run `check-auth.cjs hubspot` to verify the connection exists and get the correct connectionId
- **Provider Mismatch**: Ensure you are using the `hubspot` provider config key when connecting to Nango
- **Empty Response**: The tools may return an empty response if the HubSpot token doesn't have the correct scopes. Ensure the connection was created with proper OAuth scopes
- **Connection Failed**: Verify that `https://api.nango.dev/mcp` is accessible and the `Provider-Config-Key` header is correctly set to `hubspot`

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY task operation, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After creating a task:
```
✓ Task created successfully!

Title: [task title]
Due Date: [formatted date]
Task ID: [id]
Assigned To: [email or name]
```

After updating a task:
```
✓ Task updated successfully!

Task ID: [id]
Changes: [what was changed]
```

After deleting a task:
```
✓ Task deleted successfully!

Task ID: [id]
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Task created with ID 123"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.
