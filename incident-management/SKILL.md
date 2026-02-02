---
name: incident-management
description: >-
  Skill for creating and listing incidents via the Incident Management MCP
  server. Includes OAuth handling.
metadata:
  createdAt: '2026-02-01T21:10:53.440Z'
  lastTestDate: '2026-02-02T08:59:40.005Z'
  passRate: 100
allowed-tools:
  - Incident-Management-v4_createIncident
  - Incident-Management-v4_listIncident
  - Incident-Management-v4_retrieveIncident
mcp-servers:
  - Incident-Management-v4
depends-on:
  - mcp-server-oauth
---
# Incident Management Skill

This skill allows you to create and list incidents using the Incident Management MCP server. It handles OAuth authentication if required.

## Authentication

1. The skill attempts to connect to the Incident Management MCP server.
2. If the server requires OAuth, the skill will present an authentication URL to the user, following the process described in the [mcp-server-oauth](skill:mcp-server-oauth) skill.
3. After successful authentication (confirmed by the user), the skill stores the necessary credentials for future use.

## Creating an Incident

1. Provide the required incident details:
    - `name` (string): The name of the incident.
    - `category` (string): The category of the incident.
    - `priority` (string): The priority of the incident (critical, high, medium, low).
    - `state` (string): The state of the incident (raised, updated, cleared).
    - `ackState` (string): The ack state of the incident (acknowledged, unacknowledged).
    - `occurTime` (string): The time at which the incident occurred (e.g., 2024-01-01T12:00:00Z).
    - `domain` (string): The domain of the incident.
    - `sourceObject` (array): An array containing at least one object with an `id` representing the source of the incident.
2. The skill creates a new incident using the provided details.

## Listing Incidents

1. The skill retrieves a list of existing incidents from the Incident Management MCP server.
2. The list of incidents is displayed to the user.

## Usage

To create an incident, provide the required incident details. To list incidents, simply request the list.
