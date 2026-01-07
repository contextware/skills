---
name: create-incident
description: >-
  Creates a new incident using the Incident Management API. Handles the specific
  data structure requirements, including wrapping sourceObject in an array.
metadata:
  createdAt: '2026-01-07T19:30:45.728Z'
allowed-tools:
  - Incident-Management-v4_createIncident
mcp-servers:
  - Incident-Management-v4
---

## Overview

This skill creates a new incident using the Incident Management API. It handles the specific data structure requirements of the API.

## MCP Server Requirements

This skill requires the **Incident-Management-v4** MCP server.

To connect to this server, use the `connect_to_mcp_server` tool and specify "Incident-Management-v4" as the server name.

## Prerequisites

*   The agent must be connected to the `Incident-Management-v4` MCP server before using this skill.

## Step-by-step instructions

1.  **Gather the incident details:** Collect the necessary information for the incident, including:
    *   `name`: The name of the incident.
    *   `category`: The category of the incident.
    *   `priority`: The priority of the incident (e.g., "high", "medium", "low").
    *   `severity`: The severity of the incident (e.g., "critical", "major", "minor").
    *   `state`: The state of the incident (e.g., "raised", "acknowledged", "resolved").
    *   `occurTime`: The time the incident occurred (in ISO 8601 format, e.g., "2024-01-24T10:00:00Z").
    *   `domain`: The domain of the incident.
    *   `sourceObject`: An object representing the affected source.  This MUST be provided as an array containing a single object with "id" and "href" keys (e.g., `[{"id": "12345", "href": "/resource/12345"}]`).

2.  **Format the `sourceObject`**: Ensure the `sourceObject` is structured as an array containing a single object with the `id` and `href` properties.  For example: `[{"id": "resource123", "href": "/resources/resource123"}]`

3.  **Call the `Incident-Management-v4_createIncident` tool:** Use the `execute_mcp_tool` to call the `Incident-Management-v4_createIncident` tool. Provide the incident details as arguments to the tool. Make always to set `ackState` to a string value.

4.  **Display the results:**  If the call is successful, the tool will return the details of the created incident, including its ID. Display this information to the user.

## Error handling

*   **HTTP error 400: Bad Request - {'code': 22, 'reason': 'Invalid body', 'message': 'Expected type array but found type object'}**: This error indicates that the `sourceObject` is not in the expected format. Ensure it is an array containing a single object.

## Examples

Here's an example of how to call the `Incident-Management-v4_createIncident` tool:

```json
{
    "name": "Network Outage",
    "category": "Network",
    "priority": "high",
    "severity": "critical",
    "state": "raised",
    "occurTime": "2024-01-24T10:00:00Z",
    "domain": "Core",
    "sourceObject": [{"id": "network123", "href": "/networks/network123"}],
    "ackState": "unacknowledged",
    "eventId": [],
    "rootEventId": [],
    "extensionInfo": [],
    "rootCause": [],
    "externalIdentifier": []
}
```