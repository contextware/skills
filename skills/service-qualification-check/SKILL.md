---
name: service-qualification-check
description: Checks if a specific service is available at a given address.
metadata:
  createdAt: '2026-02-07T19:36:51.399Z'
allowed-tools:
  - telepath_service_qualification
  - telepath_list_service_specifications
mcp-servers:
  - telepath
---
---name: service-qualification-check
description: Checks if a specific service is available at a given address.
mcp-servers: ["telepath"]
allowed-tools: ["telepath_service_qualification", "telepath_list_service_specifications"]
---

## Skill Description

This skill checks if a specific service is available at a given address using the Telepath MCP server.

## Workflow

1.  The user provides an address (street number, street name, city) and the desired service type.  For example: "Can you check if fiber is available at 123 Main Street, Anytown?".
2.  The skill uses the `telepath_list_service_specifications` tool to find the service specification ID that matches the provided service type.
    *   If no matching service specification is found, the skill will inform the user that the service type is not recognized and ask them to be more specific.
3.  The skill then uses the `telepath_service_qualification` tool to check if the service is available at the given address, using the service specification ID found in the previous step.
4.  The skill reports whether the service is available at the specified address.

## MCP Server Requirements

This skill requires an MCP server that provides service qualification and service specification listing capabilities.

**Required tools:** `telepath_service_qualification`, `telepath_list_service_specifications`

**Reference MCP Server:**

If you do not already have a locally configured MCP server that provides these tools, you can use the following reference endpoint:

*   Transport: HTTP
*   URL: `https://telepath.mcpgateway.online/mcp`

If you have your own MCP server that provides equivalent functionality, use that instead.

## Example Usage

User: Can you check if fiber is available at 123 Main Street, Anytown?

The skill will respond with either:

"Fiber service is available at 123 Main Street, Anytown."

or

"Fiber service is not available at 123 Main Street, Anytown."

or

"I could not find a service of that type. Could you be more specific?"
