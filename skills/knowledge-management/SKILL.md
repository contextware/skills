---
name: knowledge-management
description: Query internal company data using natural language via NLWeb MCP. Provides access to proprietary knowledge bases with OAuth authentication.
version: 1.1.0
author: agent-skills-workbench
mcp-servers: [nlweb-mcp]
allowed-tools: [ask, search]
tags: [knowledge, nlweb, oauth, search, portable, self-contained]
---

# Knowledge Management Skill

This skill enables querying internal proprietary company data using natural language through the NLWeb MCP server. It supports semantic search and question-answering over private knowledge bases.

## Prerequisites

- Access to an NLWeb MCP server instance
- OAuth credentials for authentication
- Configured knowledge base with indexed company data

## MCP Server Requirements

This skill requires the **NLWeb MCP Server** with OAuth authentication.

**Required Tools:**
- `ask`: Submit natural language questions to the knowledge base
- `search`: Search for specific documents or information

**Reference MCP Server:**
- Transport: HTTP or SSE
- URL: Contact your organization for the specific NLWeb instance URL
- Auth: OAuth 2.0 with authorization code flow

**OAuth Configuration**:
- Grant type: `authorization_code`
- Response type: `code`
- Scopes: Typically `openid`, `profile`, `nlweb:read` (verify with your server)
- Token TTL: Access tokens typically expire after 1 hour; refresh tokens may last 30 days
- PKCE: Recommended but may vary by deployment

**OAuth Authentication**:
This skill includes portable OAuth scripts for authentication. These scripts work on any platform with Node.js 18+:
- **discover-oauth.cjs**: Discovers OAuth endpoints from the MCP server (RFC 8414 compliant)
- **build-auth-url.cjs**: Builds PKCE-compliant authorization URL
- **exchange-token.cjs**: Exchanges authorization code for access token
- **check-oauth-status.cjs**: Checks current authentication status

All scripts use environment variables for secrets (never CLI arguments) and have zero external dependencies.

---

## Workflow

**GOAL**: Retrieve answers from internal knowledge bases. Authentication is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `ask`, `search`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the NLWeb MCP server:
- URL: See Prerequisites for the configured NLWeb server URL
- Auth Type: OAuth 2.0
- If your platform handles OAuth automatically, let it manage the flow.
- If manual OAuth is needed, use the bundled scripts:
  1. Run `discover-oauth.cjs <nlweb-server-url>` to find OAuth endpoints
  2. Run `build-auth-url.cjs` with the discovered endpoints to generate auth URL
  3. Present the auth URL to the user for authorization (**STOP AND WAIT** for user confirmation)
  4. After user authorizes, capture the authorization code from the callback
  5. Run `exchange-token.cjs` with the code to get access token
  6. Store and inject the access token in MCP server connection headers
Once authenticated, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the NLWeb MCP server to your agent's MCP configuration:
- Server URL: Your NLWeb server URL
- Auth: OAuth 2.0 (token must be obtained separately)
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

**Token Expiration**: Access tokens typically expire after 1 hour. If you receive a 401 Unauthorized error, the token has likely expired. Re-run the OAuth flow to obtain a fresh token. Some implementations provide refresh tokens that can be used to obtain new access tokens without full re-authentication.

### Step 2: Query the Knowledge Base

#### Asking Questions

Use the `ask` tool to submit natural language questions.

**Required Parameters**:
- **query** (string): The natural language question to ask

**Optional Parameters** (implementation-specific):
- **context** (string): Additional context to help refine the query
- **max_results** (integer): Maximum number of results to return
- **filters** (object): Metadata filters (e.g., department, date range)

**Expected Response**:
```json
{
  "answer": "The CEO of the company is John Smith.",
  "confidence": 0.95,
  "sources": [
    {
      "title": "Executive Team - Company Wiki",
      "url": "https://wiki.company.com/executives",
      "excerpt": "...John Smith was appointed CEO in 2020..."
    }
  ],
  "timestamp": "2026-02-11T10:30:00Z"
}
```

#### Searching Documents

Use the `search` tool to find specific documents or information.

**Required Parameters**:
- **query** (string): Search terms or keywords

**Optional Parameters** (implementation-specific):
- **filters** (object): Metadata filters
- **limit** (integer): Maximum number of results
- **offset** (integer): Pagination offset

**Expected Response**:
```json
{
  "results": [
    {
      "id": "doc-12345",
      "title": "Q4 2025 Financial Report",
      "excerpt": "Revenue increased by 25% compared to Q3...",
      "url": "https://docs.company.com/finance/q4-2025",
      "relevance": 0.89,
      "metadata": {
        "department": "Finance",
        "date": "2025-12-31"
      }
    }
  ],
  "total": 15,
  "page": 1
}
```

---

## Bundled Scripts

All scripts use Node.js built-in `fetch` (Node 18+) with ZERO external dependencies. They are portable across any platform.

### discover-oauth.cjs

**Purpose**: Discovers OAuth 2.0 endpoints from an MCP server (RFC 8414 compliant).

**Usage**:
```bash
node scripts/discover-oauth.cjs <server-url>
```

**Arguments**:
- `server-url`: The base URL of the MCP server (e.g., `https://nlweb.example.com`)

**Output**: JSON with OAuth endpoints or discovery status.

**Example**:
```bash
node scripts/discover-oauth.cjs https://nlweb.example.com
```

**Expected Response**:
```json
{
  "status": "discovered",
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "scopes_supported": ["openid", "profile", "nlweb:read"]
}
```

### build-auth-url.cjs

**Purpose**: Builds a PKCE-compliant authorization URL for OAuth flow.

**Usage**:
```bash
node scripts/build-auth-url.cjs <authorization_endpoint> --client-id=<id> --redirect-uri=<uri> [--scope=<scope>]
```

**Arguments**:
- `authorization_endpoint`: The authorization endpoint URL from discover-oauth.cjs

**Options**:
- `--client-id=<id>` (required): OAuth client ID
- `--redirect-uri=<uri>` (required): Redirect URI after authorization
- `--scope=<scope>` (optional): Space-separated scopes (default: "openid profile nlweb:read")
- `--state=<state>` (optional): Custom state parameter (auto-generated if not provided)

**Output**: JSON with authorization URL and code verifier (save the verifier for token exchange).

**Example**:
```bash
node scripts/build-auth-url.cjs https://auth.example.com/authorize \
  --client-id=nlweb-client \
  --redirect-uri=http://localhost:3000/callback \
  --scope="openid profile nlweb:read"
```

**Expected Response**:
```json
{
  "authUrl": "https://auth.example.com/authorize?client_id=...",
  "codeVerifier": "abc123...",
  "state": "xyz789..."
}
```

**⚠️ IMPORTANT**: Save the `codeVerifier` value - you'll need it for the token exchange step.

### exchange-token.cjs

**Purpose**: Exchanges authorization code for access token using PKCE.

**Usage**:
```bash
node scripts/exchange-token.cjs <token_endpoint> --code=<authorization_code> --code-verifier=<verifier> --client-id=<id> --redirect-uri=<uri>
```

**Arguments**:
- `token_endpoint`: The token endpoint URL from discover-oauth.cjs

**Options**:
- `--code=<code>` (required): Authorization code from the callback
- `--code-verifier=<verifier>` (required): The code verifier from build-auth-url.cjs
- `--client-id=<id>` (required): OAuth client ID
- `--redirect-uri=<uri>` (required): Redirect URI used in authorization
- `--client-secret=<secret>` (optional): Client secret for confidential clients

**Environment Variables** (alternative):
- `OAUTH_CLIENT_SECRET` (optional): Client secret (more secure than command-line flag)

**Output**: JSON with access token, refresh token, and expiry.

**Example**:
```bash
node scripts/exchange-token.cjs https://auth.example.com/token \
  --code=AUTH_CODE_HERE \
  --code-verifier=abc123... \
  --client-id=nlweb-client \
  --redirect-uri=http://localhost:3000/callback
```

**Expected Response**:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "def456...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### check-oauth-status.cjs

**Purpose**: Checks current OAuth authentication status by testing the access token.

**Usage**:
```bash
ACCESS_TOKEN=your_token node scripts/check-oauth-status.cjs <server_url>
```

**Environment Variables**:
- `ACCESS_TOKEN` (required): The access token to validate

**Arguments**:
- `server_url`: The NLWeb server URL

**Output**: JSON with authentication status.

**Example**:
```bash
ACCESS_TOKEN=eyJhbGc... node scripts/check-oauth-status.cjs https://nlweb.example.com
```

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Use the `mcp-server-oauth` skill to handle the complete OAuth flow
2. The connection persists for the session duration (typically until token expiration)
3. Access tokens are automatically included in all tool calls
4. Agents should treat authentication and query as a single workflow

### Static MCP Configuration
For agents requiring config file + restart:
1. Complete the OAuth flow manually to obtain an access token
2. Add the NLWeb MCP server to your agent's configuration
3. Include the `Authorization: Bearer <token>` header in server config
4. Restart the agent to apply the configuration
5. Tools will be immediately available

### Continuous Workflow Pattern
Agents should treat authentication and knowledge retrieval as a single operation. Only report the final result (e.g., "The CEO is John Smith") to the user. Do not pause to say "I am now connected" or "Authentication complete."

### Token Refresh
Some NLWeb deployments provide refresh tokens. If available:
- Store the refresh token securely
- When access token expires (401 error), use refresh token to obtain new access token
- This avoids requiring user re-authentication for every session

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the NLWeb MCP server is connected and running
- **401 Unauthorized**: Access token is missing or expired. Re-run OAuth flow to obtain new token
- **403 Forbidden**: Token is valid but lacks required scopes. Check OAuth scopes during authorization:
  - Typically requires: `nlweb:read` or equivalent
  - Some operations may require: `nlweb:write` (if creating/updating knowledge)
- **429 Too Many Requests**: Rate limit exceeded. Wait before retrying (check `Retry-After` header)
- **400 Bad Request**: Check that the query is not empty and is a valid string
- **404 Not Found**: The knowledge base may not exist or is not accessible to the authenticated user
- **OAuth Discovery Failed**: The server may not support standard OAuth discovery endpoints. Contact your NLWeb administrator for OAuth configuration details
- **Token Exchange Failed**: Verify the authorization code hasn't expired (codes typically expire after 10 minutes)
- **Empty or Poor Results**:
  - Try rephrasing the question
  - Add more context or specificity
  - Check that the knowledge base has been recently indexed
  - Verify the data sources are accessible to your user account

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY knowledge query, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After asking a question:
```
✓ Here's what I found:

[Answer from the knowledge base]

Sources:
- [Source 1 title]
- [Source 2 title]
...

Confidence: [confidence score if available]
```

After searching:
```
✓ Found [N] results for "[query]":

1. [Document Title]
   [Excerpt or summary]
   Source: [URL if available]

2. [Document Title]
   [Excerpt or summary]
   Source: [URL if available]
...
```

If no results found:
```
✗ No results found for "[query]".

Suggestions:
- Try rephrasing your question
- Use different keywords
- Check if you have access to the relevant knowledge base
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"The CEO is John Smith, appointed in 2020."`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.

---

## Example Usage

### Example 1: Asking a Direct Question

**User**: "Who is our current CTO?"

**Agent workflow**:
1. Ensures NLWeb MCP is connected (auth if needed)
2. Calls `ask` tool with query: "Who is our current CTO?"
3. Receives response with answer and sources
4. Presents formatted answer to user

**Agent response**:
```
✓ Here's what I found:

The current CTO is Sarah Johnson. She joined the company in 2023 and leads the engineering and product development teams.

Sources:
- Executive Team - Company Wiki
- Leadership Announcements 2023

Confidence: 0.97
```

### Example 2: Searching for Documents

**User**: "Find all documents about the Q4 product roadmap"

**Agent workflow**:
1. Ensures NLWeb MCP is connected
2. Calls `search` tool with query: "Q4 product roadmap"
3. Receives list of matching documents
4. Presents formatted results to user

**Agent response**:
```
✓ Found 3 results for "Q4 product roadmap":

1. Q4 2025 Product Roadmap - Final
   Overview of planned feature releases and timeline for Q4 2025...
   Source: Product Team Drive

2. Product Strategy Meeting Notes - Oct 2025
   Discussion of Q4 priorities and resource allocation...
   Source: Meeting Notes Archive

3. Engineering Sprint Plan - Q4
   Technical implementation plan for Q4 roadmap items...
   Source: Engineering Wiki
```
