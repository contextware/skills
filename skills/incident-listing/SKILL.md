---
name: incident-listing
description: >-
  Skill for retrieving and summarizing incidents using an MCP Incident
  Management server. Enables agents to list incidents, optionally filter them,
  and present results clearly to users.
metadata:
  createdAt: '2026-02-01T13:44:46.358Z'
allowed-tools:
  - Incident-Management-v4_listIncident
mcp-servers:
  - Incident-Management-v4
---
# Incident Listing Skill

This skill enables you to retrieve and summarize incidents through an Incident Management system.

## MCP Server Requirements

This skill depends on an MCP server that implements the TMF724 Incident Management API (e.g., **Incident-Management-v4**).

**Required Tool:**
- `listIncident`: Retrieves a list of incidents from the system.

**Authentication:**
This server is typically protected by OAuth 2.0. If the server is not already connected:
1. Attempt to connect.
2. If authentication is required, the platform will provide an authorization URL.
3. Present this URL to the user and wait for confirmation of successful authentication.
4. Retry the connection once confirmed.

---

## Workflow

### Phase 1: Establish Connection
Ensure the Incident Management MCP server is connected. If prompted for authentication, follow the platform-guided OAuth flow and wait for the user to complete it.

### Phase 2: Retrieve Incidents
Use the `listIncident` tool to fetch current incidents. 

**Filtering Guidelines:**
- If the user request is broad, fetch all incidents first.
- Only apply filters (like `state`, `priority`, `domain`) if the user explicitly mentions them.
- Common filter values: `state` (raised, cleared), `priority` (critical, high, medium, low).

### Phase 3: Summarize and Present
Present the results in a concise summary format. Focus on highlights like:
- Incident ID and Name
- Current State and Priority
- Domain or Category

---

## Example Output

> I found **2 active incidents**:
> - **Incident 8675309**: Raised, high priority, RAN domain.
> - **Incident 420965**: Raised, medium priority, radio interference.

## Best Practices

- **Source of Truth**: Treat the MCP tool response as the absolute source of truth.
- **Natural Language**: Summarize data rather than dumping JSON.
- **Explicit Confirmation**: Always wait for user confirmation after presenting an OAuth URL.

