---
name: incident-listing
description: >-
  Skill for retrieving and summarizing incidents using the MCP Incident
  Management server. Enables agents to list incidents, optionally filter them,
  and present results clearly to users.
license: Complete terms in LICENSE.txt
mcp-servers:
  - Incident-Management-v4
allowed-tools:
  - Incident-Management-v4_listIncident
tags: [incident, tmforum, mcp, oauth]
---

# Incident Listing Skill

This skill enables the agent to retrieve incidents from the Incident Management system via the MCP server.

## MCP Server Requirements

This skill requires the **Incident-Management-v4** MCP server to be connected.

> [!IMPORTANT]
> This server is **OAuth-protected**. When you attempt to connect, the platform will:
> 1. Return a `requires_auth` status with an authorization URL
> 2. Present this URL to the user and **WAIT** for them to complete authentication
> 3. After user confirms authentication, retry the connection

**Server Details:**
- Transport: HTTP
- URL: Configured in MCP registry
- API: TMF724 Incident Management API

**Authentication:**
- Type: OAuth 2.0
- Flow: Platform-handled (see `mcp-server-oauth` skill for details)

**Available Tools (after authentication):**
- `Incident-Management-v4_listIncident` - Retrieve incidents from the system
- `Incident-Management-v4_createIncident` - Create new incidents (used by the create-incident skill)

---

## Workflow

### Phase 1: Connect to MCP Server

1. Use `connect_to_mcp_server` with "Incident-Management-v4" as the server name
2. **If status is `requires_auth`:**
   - Present the `authUrl` to the user as a clickable link
   - Tell the user: "Please click the link to authorize access, then let me know when done."
   - **STOP AND WAIT** for user confirmation
   - After user confirms, retry `connect_to_mcp_server`
3. **If status is `success`:** Proceed to Phase 2

### Phase 2: List Incidents

This skill focuses exclusively on **listing incidents** using the `listIncident` tool.


---

## When to Use This Skill

Use the `listIncident` MCP tool when the user asks to:

* List incidents (e.g., “show incidents”, “list open incidents”)
* Review recent or current incidents
* Find incidents by state, priority, category, domain, or time
* Summarize operational issues affecting resources or services

❌ Do **not** attempt to infer incident details without calling the tool
❌ Do **not** attempt to fetch a single incident by ID unless the MCP server explicitly supports it

---

## Core MCP Tool

### `listIncident`

This tool retrieves one or more Incident resources from the Incident Management API.

It corresponds to the TMF724 operation:

```
GET /incident
```

The response is a **list of Incident objects**, each representing an operational issue that has been raised, updated, or cleared.

---

## How the Agent Should Use `listIncident`

### 1. Always Start with `listIncident` for Discovery

If the user’s request is broad or exploratory (e.g., *“What incidents are active?”*), call `listIncident` **without filters** first.

This provides the full incident set, which the agent can then:

* Filter mentally
* Summarize
* Ask follow-up questions if needed

---

### 2. Apply Filters Only When Clearly Requested

If the user specifies constraints, pass them as filters to `listIncident` **only when they are explicit**.

Common filters include:

* `state` (e.g., `raised`, `cleared`)
* `priority` (critical, high, medium, low)
* `urgency`
* `domain`
* `category`

Example user intents → filtering behavior:

| User Request              | MCP Tool Usage                          |
| ------------------------- | --------------------------------------- |
| “Show all incidents”      | `listIncident` (no filters)             |
| “List raised incidents”   | `listIncident` with `state=raised`      |
| “Any critical incidents?” | `listIncident` with `priority=critical` |
| “Incidents in RAN domain” | `listIncident` with `domain=RAN`        |

If filtering support is uncertain, **retrieve all incidents and filter in reasoning**, not by inventing parameters.

---

### 3. Treat the Response as Authoritative

The MCP tool response is the **source of truth**.

Do not:

* Guess missing fields
* Assume ordering unless explicitly stated
* Infer resolution status without checking the `state` field

Each Incident may include (but is not limited to):

* `id`
* `name`
* `category`
* `state`
* `priority`
* `urgency`
* `domain`
* `occurTime`
* `updateTime`
* `ackState`

---

## How to Present Results to the User

After calling `listIncident`, the agent should:

1. **Summarize first**, then optionally detail
2. Highlight:

   * Incident name or ID
   * State (raised / cleared)
   * Priority or urgency
   * Domain or category if relevant
3. Avoid dumping raw JSON unless explicitly requested

### Example Summary Pattern

> I found **3 active incidents**:
>
> * **Incident 8675309** – Raised, low priority, RAN domain
> * **Incident 420965** – Raised, medium urgency, antenna feeder failure
> * **Incident 1234567** – Cleared earlier today

---

## Common Pitfalls to Avoid

❌ Do not assume “cleared” means fully resolved without checking `state`
❌ Do not create incidents when the user only asked to list
❌ Do not reference REST endpoints or HTTP verbs in the user-facing response
❌ Do not fabricate filtering capabilities not exposed by the MCP server

---

## Best Practices

* Prefer **clarity over completeness** when summarizing incidents
* If many incidents are returned, ask the user how they want them filtered
* Use incident `state`, `priority`, and `urgency` to guide what is “important”
* Keep language operational and concise

---

## Skill Boundary

This skill:

* ✅ Lists incidents using `listIncident`
* ❌ Does not create incidents
* ❌ Does not diagnose or resolve incidents
* ❌ Does not subscribe to notifications

For incident creation, use the **Incident Creation skill** (backed by `createIncident`).

