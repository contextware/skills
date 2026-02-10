---
name: hubspot-task-manager
description: >-
  Manage HubSpot tasks (create, update, delete) via Nango MCP. Optimized for
  continuous execution.
metadata:
  createdAt: '2026-02-08T20:01:18.265Z'
allowed-tools:
  - nango-mcp-server_whoami
  - nango-mcp-server_create-task
  - nango-mcp-server_update-task
  - nango-mcp-server_delete-task
  - nango-mcp-server_fetch-account-information
mcp-servers:
  - nango-mcp-server
depends-on:
  - connect-to-nango-mcp
---
# HubSpot Task Manager

A skill for managing HubSpot tasks (create, update, delete) using the Nango MCP server.

## MCP Server Requirements

This skill requires the **Nango MCP Server** configured for the HubSpot provider.

**Required Tools:**
- `nango-mcp-server_whoami`: To identify the current user for task assignment.
- `nango-mcp-server_create-task`: To create new tasks.
- `nango-mcp-server_update-task`: To modify existing tasks.
- `nango-mcp-server_delete-task`: To remove tasks.

**Reference MCP Server:**
- **Name**: `nango-mcp-server`
- **URL**: `https://api.nango.dev/mcp`
- **Transport**: HTTP

---

## Workflow

### Step 1: Ensure Connection & Authentication
Ensure you are connected to the Nango MCP server with the `hubspot` provider. If not connected, follow the instructions in the `connect-to-nango-mcp` skill.

**⚠️ CONNECTION-ID WARNING**: When configuring the MCP server headers, you MUST use the `connectionId` returned by `check-auth.js` (e.g., `hubspot-abc123`), NOT the `NANGO_DEFAULT_USER_ID` (which is typically an email address). Using an email as the `connection-id` will result in HTTP 400 errors.

**CRITICAL - CONTINUOUS EXECUTION**: Once authentication is successful and the MCP server is connected, you must proceed immediately to Step 2 and Step 3 without stopping for confirmation or reporting connection status. The user's goal is the task management, not the connection.

### Step 2: Identify User (Assignment)
Identify the current HubSpot user ID by calling `nango-mcp-server_whoami`. Use this ID for the `assigned_to` field unless a different assignee is specified.

### Step 3: Manage Tasks

#### Creating a Task
Use the `nango-mcp-server_create-task` tool. 
**Important Requirements**:
- **assigned_to**: Use the ID from Step 2.
- **task_type**: Default to `TODO` if not specified.
- **priority**: Default to `LOW` or `MEDIUM` if not specified.
- **due_date**: Must be in ISO 8601 format (e.g., `2026-03-31T00:00:00Z`).
- **title**: A descriptive name for the task.

#### Updating a Task
Use `nango-mcp-server_update-task`. You must provide the task `id`. You only need to provide the specific fields you wish to change (e.g., `due_date` or `notes`
).

#### Deleting a Task
Use `nango-mcp-server_delete-task` with the task `id`.

---

## Platform Adaptation Notes

### Continuous Workflow Pattern
Agents should treat the connection, identification, and task creation as a single atomic operation. Only report the final result (e.g., "Task created with ID X"
) to the user. Do not pause to say "I am now connected" or "I have found your user ID."

### Date Handling
Always convert natural language dates (e.g., "tomorrow at noon", "end of next month") into ISO 8601 strings before calling the tools.

### Error Handling
- **HTTP 400 Bad Request during connection**: This means the `connection-id` header is wrong. You likely used `NANGO_DEFAULT_USER_ID` (an email) instead of the `connectionId` from `check-auth.js`. Re-run `check-auth.js` and use the `connectionId` field from the output.
- **"Invalid input provided"**: Ensure all "Required" fields (especially `assigned_to`, `task_type`, and `priority`) are present in the request.

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY task operation, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After creating a task:
✓ Task created successfully!

Title: [task title]
Due Date: [formatted date]
Task ID: [id]
Assigned To: [email or name]


After updating a task:
✓ Task updated successfully!

Task ID: [id]
Changes: [what was changed]


After deleting a task:
✓ Task deleted successfully!

Task ID: [id]


### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Task created with ID 123"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.