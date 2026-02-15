---
name: jira-issue-manager
description: 'A skill to manage Jira issues, including listing issue types.'
metadata:
  createdAt: '2026-01-29T16:55:45.735Z'
allowed-tools: []
mcp-servers:
  - nango-mcp-server
depends-on:
  - connect-to-nango-mcp
---
# Jira Issue Manager

This skill helps manage Jira issues. It depends on the `connect-to-nango-mcp` skill for authentication.

## Critical Setup: Discovering Jira Cloud ID

Jira API calls via Nango proxy require a `cloudId` (site ID) in the path. You must discover this dynamically from the connection details before making other calls.

### 1. Discover the Cloud ID

Run the `scripts/get-cloud-id.cjs` script:

```bash
node scripts/get-cloud-id.cjs <NANGO_SECRET_KEY> <connectionId> [provider]
```

Example:
```bash
node scripts/get-cloud-id.cjs cf0e919c-5280-4908-9865-0baa6df2eb10 9072b6a9-a672-4b55-9566-f31a191b341d jira
```

### 2. List Projects (Optional)

To find project IDs or keys:

```bash
node scripts/get-projects.cjs <cloudId> <NANGO_SECRET_KEY> <connectionId> [provider]
```

### 3. Listing Issue Types

To list issue types (globally or for a specific project):

```bash
node scripts/get-issue-types.cjs <cloudId> <NANGO_SECRET_KEY> <connectionId> [provider] [projectId]
```

Example (Global):
```bash
node scripts/get-issue-types.cjs efe59576-1147-4e4b-96b5-7615e308a36b cf0e919c-5280-4908-9865-0baa6df2eb10 9072b6a9-a672-4b55-9566-f31a191b341d jira
```

Example (Project-specific):
```bash
node scripts/get-issue-types.cjs efe59576-1147-4e4b-96b5-7615e308a36b cf0e919c-5280-4908-9865-0baa6df2eb10 9072b6a9-a672-4b55-9566-f31a191b341d jira 10001
```

## Usage

### Creating a Jira Issue

To create a Jira issue, use the `nango-mcp-server_create_issue` tool with the following arguments:

*   `summary`: The summary of the issue.
*   `project`: The project ID (e.g., "10001").
*   `issueType`: The issue type ID (e.g., "10011").

Example:
```json
{
    "summary": "Test issue created by agent",
    "project": "10001",
    "issueType": "10011"
}
```

## Troubleshooting

If you receive a 404 error when calling Jira, verify that the `cloudId` is correct. Some Jira instances might use a different version of the API (v2 vs v3); the scripts default to v3.

