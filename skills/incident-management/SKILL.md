---
name: incident-management
description: >-
  Skill for creating and listing incidents via the Incident Management MCP
  server. Includes OAuth handling.
version: 4.1.0
author: agent-skills-workbench
mcp-servers: [Incident-Management-v4]
allowed-tools: [createIncident, listIncident, retrieveIncident]
tags: [tmf, incident, oauth, portable, self-contained]
---

# Incident Management Skill

This skill allows you to create and list incidents using the Incident Management MCP server. It handles OAuth authentication if required.

## Prerequisites

- Access to an Incident Management MCP server
- OAuth credentials (if server requires authentication)
- Node.js 18+ (if using bundled scripts)

## MCP Server Requirements

This skill requires an **Incident Management MCP server** (TMF724-based).

**Required Tools:**
- `createIncident`: To create new incidents
- `listIncident`: To retrieve and filter incidents
- `retrieveIncident`: To get details of a specific incident

**Reference MCP Server:**
- Transport: HTTP
- URL: Contact your service provider for the specific URL
- Auth: OAuth 2.0 with PKCE (RFC 7636)

**⚠️ TMF SCHEMA COMPATIBILITY WARNING**:
This skill uses TMF Forum schemas which include `@type`, `@baseType`, `@schemaLocation`, and `@referredType` properties. Some agent platforms may have issues with `@`-prefixed property names due to schema validation restrictions. The Context-Serve platform automatically remediates these properties to `atType`, `atBaseType`, `atSchemaLocation`, and `atReferredType` equivalents. If using this skill on other platforms, you may need to handle this transformation yourself.

**OAuth Authentication**:
This skill is self-contained and includes portable OAuth scripts for authentication. These scripts work on any platform with Node.js 18+:
- **discover-oauth.cjs**: Discovers OAuth endpoints from the MCP server (RFC 8414 compliant)
- **build-auth-url.cjs**: Builds PKCE-compliant authorization URL
- **exchange-token.cjs**: Exchanges authorization code for access token
- **check-oauth-status.cjs**: Checks current authentication status

All scripts use environment variables for secrets (never CLI arguments) and have zero external dependencies.

---

## Workflow

**GOAL**: Manage incidents programmatically. Authentication is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `createIncident`, `listIncident`, `retrieveIncident`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the Incident Management MCP server:
- URL: `https://tmf724.mcpgateway.online/mcp`
- Auth Type: OAuth 2.0
- If your platform handles OAuth automatically, let it manage the flow.
- If manual OAuth is needed, use the bundled scripts:
  1. Run `discover-oauth.cjs <server-url>` to find OAuth endpoints
  2. Run `build-auth-url.cjs` with the discovered endpoints to generate auth URL
  3. Present the auth URL to the user for authorization (**STOP AND WAIT** for user confirmation)
  4. After user authorizes, capture the authorization code from the callback
  5. Run `exchange-token.cjs` with the code to get access token
  6. Store and inject the access token in MCP server connection headers
Once authenticated, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Incident Management MCP server to your agent's MCP configuration:
- Server URL: `https://tmf724.mcpgateway.online/mcp`
- Auth: OAuth 2.0 (token must be obtained separately)
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: Create or List Incidents

#### Creating an Incident

Use the `createIncident` tool with the following parameters:

**Required Parameters**:
- **name** (string): The name/title of the incident
- **category** (string): The category of the incident (e.g., "network", "service", "infrastructure")
- **priority** (string): Priority level - must be one of: `critical`, `high`, `medium`, `low`
- **state** (string): Current state - must be one of: `raised`, `updated`, `cleared`
- **ackState** (string): Acknowledgment state - must be one of: `acknowledged`, `unacknowledged`
- **occurTime** (string): ISO 8601 timestamp when incident occurred (e.g., `2024-01-01T12:00:00Z`)
- **domain** (string): The domain or system affected (e.g., "network", "compute")
- **sourceObject** (array): Array with at least one object containing an `id` field representing the source

**Optional Parameters**:
- **description** (string): Detailed description of the incident
- **severity** (string): Severity level
- **affectedLocation** (array): Array of affected location objects
- **affectedResource** (array): Array of affected resource objects
- **correlationId** (string): ID for correlating related incidents

**Expected Response**:
```json
{
  "id": "INC-12345",
  "href": "/incident/INC-12345",
  "name": "Network outage in Region A",
  "category": "network",
  "priority": "critical",
  "state": "raised",
  "ackState": "unacknowledged",
  "occurTime": "2024-01-01T12:00:00Z",
  "domain": "network",
  "sourceObject": [{ "id": "router-01" }],
  "@type": "Incident"
}
```

Note: Response may include `atType` instead of `@type` on some platforms.

#### Listing Incidents

Use the `listIncident` tool to retrieve incidents.

**Optional Parameters**:
- **fields** (string): Comma-separated list of fields to return (e.g., `"id,name,priority,state"`)
- **offset** (integer): Pagination offset (default: 0)
- **limit** (integer): Max number of results (default: 50)

**Filtering**: Some implementations support query parameters like `priority=critical` or `state=raised`. Check your server's API documentation.

**Expected Response**:
```json
[
  {
    "id": "INC-12345",
    "name": "Network outage in Region A",
    "priority": "critical",
    "state": "raised",
    "occurTime": "2024-01-01T12:00:00Z"
  },
  {
    "id": "INC-12346",
    "name": "Service degradation",
    "priority": "high",
    "state": "updated",
    "occurTime": "2024-01-01T13:30:00Z"
  }
]
```

#### Retrieving a Specific Incident

Use the `retrieveIncident` tool with the incident ID.

**Required Parameters**:
- **id** (string): The incident ID

**Expected Response**: Full incident object with all details

---

## Bundled Scripts

All scripts use Node.js built-in `fetch` (Node 18+) with ZERO external dependencies. They are portable across any platform.

### discover-oauth.cjs

**Purpose**: Discovers OAuth 2.0 endpoints from an MCP server (RFC 8414 compliant).

**Usage**:
```bash
node scripts/discover-oauth.cjs https://mcp.example.com
```

**Output**: JSON with OAuth endpoints or discovery status.

### build-auth-url.cjs

**Purpose**: Builds a PKCE-compliant authorization URL.

**Usage**:
```bash
CLIENT_ID=your_client_id \
REDIRECT_URI=your_redirect_uri \
node scripts/build-auth-url.cjs <authorization_endpoint>
```

**Environment Variables**:
- `CLIENT_ID` (required): OAuth client ID
- `REDIRECT_URI` (required): Redirect URI after authorization
- `SCOPE` (optional): Space-separated scopes (default: "openid")

**Output**: JSON with authorization URL and code verifier (save the verifier for token exchange).

### exchange-token.cjs

**Purpose**: Exchanges authorization code for access token.

**Usage**:
```bash
CLIENT_ID=your_client_id \
CODE_VERIFIER=from_build_auth_url \
node scripts/exchange-token.cjs <token_endpoint> <authorization_code>
```

**Environment Variables**:
- `CLIENT_ID` (required): OAuth client ID
- `CODE_VERIFIER` (required): The code verifier from build-auth-url.cjs
- `REDIRECT_URI` (optional): Redirect URI (if required by server)

**Output**: JSON with access token, refresh token, and expiry.

### check-oauth-status.cjs

**Purpose**: Checks current OAuth authentication status.

**Usage**:
```bash
ACCESS_TOKEN=your_token node scripts/check-oauth-status.cjs <server_url>
```

**Environment Variables**:
- `ACCESS_TOKEN` (required): The access token to validate

**Output**: JSON with authentication status.

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use the bundled OAuth scripts to handle the complete OAuth flow
2. The connection persists for the session duration
3. Access tokens are automatically included in all tool calls
4. Agents should treat authentication and incident operations as a single workflow

### Static MCP Configuration
For agents requiring config file + restart:
1. Complete the OAuth flow manually using bundled scripts
2. Add the Incident Management MCP server to your agent's configuration
3. Include the `Authorization: Bearer <token>` header in server config
4. Restart the agent to apply the configuration
5. Tools will be immediately available

### Continuous Workflow Pattern
Agents should treat authentication and incident management as a single operation. Only report the final result (e.g., "Incident INC-12345 created") to the user. Do not pause to say "I am now connected" or "Authentication complete."

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the Incident Management MCP server is connected and running
- **401 Unauthorized**: Access token is missing or expired. Re-run OAuth flow to obtain new token
- **403 Forbidden**: Token is valid but lacks required scopes. Check OAuth scopes during authorization
- **400 Bad Request**: Check that all required parameters are provided and correctly formatted
  - Verify `priority` is one of: critical, high, medium, low
  - Verify `state` is one of: raised, updated, cleared
  - Verify `ackState` is one of: acknowledged, unacknowledged
  - Verify `occurTime` is in ISO 8601 format
  - Verify `sourceObject` is an array with at least one object containing an `id`
- **OAuth Discovery Failed**: The server may not support standard OAuth discovery endpoints. Contact your service provider for OAuth configuration details
- **PKCE Not Supported**: Some older OAuth servers don't support PKCE. Check server documentation for supported grant types
- **Token Exchange Failed**: Verify the authorization code hasn't expired (codes typically expire after 10 minutes) and that the `code_verifier` matches the one used during authorization URL generation
- **@-Prefixed Properties**: If you encounter schema validation errors on `@type`, `@baseType`, etc., your platform may need these properties renamed to `atType`, `atBaseType`, etc.

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY incident operation, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After creating an incident:
```
✓ Incident created successfully!

ID: [incident ID]
Name: [incident name]
Priority: [priority]
State: [state]
Occurred: [formatted time]
```

After listing incidents:
```
✓ Found [N] incidents:

1. [ID]: [Name] - Priority: [priority], State: [state]
2. [ID]: [Name] - Priority: [priority], State: [state]
...
```

After retrieving an incident:
```
✓ Incident details:

ID: [id]
Name: [name]
Priority: [priority]
State: [state]
Acknowledgment: [ackState]
Occurred: [formatted time]
Description: [description if available]
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Incident INC-12345 created"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.
