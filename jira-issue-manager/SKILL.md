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

## Usage

### Listing Issue Types

To list issue types for a Jira project, you need to:

1.  Obtain the `cloudId` from your Nango dashboard for the Jira connection.
2.  Run the `scripts/get-issue-types.js` script with the following arguments:

    ```bash
    node scripts/get-issue-types.js <cloudId> <NANGO_SECRET_KEY> <connectionId> <provider>
    ```

    *   `cloudId`: The Cloud ID of your Jira connection in Nango.
    *   `NANGO_SECRET_KEY`: Your Nango secret key.
    *   `connectionId`: The Connection ID of your Jira connection.
    *   `provider`:  `jira`

    Example:

    ```bash
    node scripts/get-issue-types.js efe59576-1147-4e4b-96b5-7615e308a36b cf0e919c-5280-4908-9865-0baa6df2eb10 9072b6a9-a672-4b55-9566-f31a191b341d jira
    ```

    The script will output a JSON array of issue types with their IDs and names.

### Creating a Jira Issue

To create a Jira issue, you need to:

1.  Connect to the `nango-mcp-server`. This requires you to have already authenticated with Nango and have a valid `connectionId` and `provider`.  See the `connect-to-nango-mcp` skill for details.
2.  Get the available issue types using the `scripts/get-issue-types.js` script as described above.
3.  Use the `nango-mcp-server_create_issue` tool with the following arguments:

    *   `summary`: The summary of the issue.
    *   `project`: The project ID.
    *   `issueType`: The issue type ID.

    Example:

    ```json
    {
        "summary": "Test issue created by agent",
        "project": "10001",
        "issueType": "10011"
    }
    ```
