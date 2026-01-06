---
name: hubspot-whoami-nango
description: Find out whoami in HubSpot using Nango
metadata:
  createdAt: '2026-01-05T19:32:39.918Z'
allowed-tools:
  - call_nango_mcp_tool
  - create_sandbox
  - run_command
  - get_skill
  - list_skill_assets
  - read_skill_asset
mcp-servers:
  - nango
depends-on:
  - nango-mcp
---
# HubSpot WhoAmI via Nango

This skill allows an agent to identify the current HubSpot user using the Nango integration.

## Overview

The skill leverages the Nango MCP server to authenticate with HubSpot and then calls the `whoami` tool to retrieve the user's information.

## Prerequisites

*   A Nango account configured with HubSpot integration.
*   The `nango-mcp` skill must be available to handle authentication.
*   The agent must have access to the `NANGO_SECRET_KEY` environment variable.

## Steps

1.  **Ask the user** if they want to find out who they are in HubSpot.
2.  **Authenticate with HubSpot via Nango:**
    *   Use the `nango-mcp` skill to obtain a `connectionId` for the HubSpot integration. If a `connectionId` is not already available, follow the instructions in the `nango-mcp` skill to authenticate.
    *   Ensure the user selects "hubspot" as the provider.
    *   The `nango-mcp` skill will handle the OAuth flow if needed.
3.  **Call the `whoami` tool:**
    *   Use the `call_nango_mcp_tool` to execute the `whoami` tool on the Nango MCP server.
    *   Set the `providerConfigKey` to "hubspot".
    *   Set the `connectionId` to the value obtained from the `nango-mcp` skill.
4.  **Present the user information:**
    *   The `whoami` tool returns a JSON object containing the user's ID and email address.
    *   Display this information to the user.

## Example Output

```json
{
  "id": 3768092,
  "email": "ivobrett@iname.com"
}
```

## Error Handling

*   If the Nango authentication fails, refer to the `nango-mcp` skill for troubleshooting steps.
*   If the `whoami` tool returns an error, display the error message to the user.
*   If the `NANGO_SECRET_KEY` environment variable is not set, inform the user that the Nango integration cannot be used.

## Allowed Tools

*   call_nango_mcp_tool

## MCP Servers

*   nango
