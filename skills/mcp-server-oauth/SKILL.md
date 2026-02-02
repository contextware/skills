---
name: mcp-server-oauth
description: Handles OAuth authentication flows for protected MCP servers that require user authorization.
version: 3.0.0
author: agent-skills-workbench
mcp-servers: []
allowed-tools: []
tags: [oauth, mcp, authentication, authorization, portable]
---

# MCP Server OAuth Authentication Skill

This skill teaches agents how to handle OAuth authentication for MCP servers that require user authorization before use.

## Overview

When connecting to an MCP server, the platform may detect that OAuth authentication is required. This skill describes how to interpret the platform's response and guide the user through authentication.

**This skill provides two approaches:**
1. **Platform-Integrated Flow** - For platforms (like agent-skills-workbench) that handle OAuth internally
2. **Portable Script Flow** - For any agent platform using the bundled Node.js scripts

## Prerequisites

### Environment Variables
- None required by this skill directly
- Individual MCP servers may require their own credentials

### Runtime
- Node.js 18+ (required for bundled scripts)

---

## RFC Standards Reference

Understanding these standards helps implement OAuth on any platform:

### RFC 8414 - OAuth 2.0 Authorization Server Metadata

Servers expose OAuth configuration at `.well-known` URLs:
- `/.well-known/oauth-authorization-server` (OAuth 2.0)
- `/.well-known/openid-configuration` (OpenID Connect)

Response includes:
```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "scopes_supported": ["openid", "profile", "mcp:tools"]
}
```

### RFC 7636 - PKCE (Proof Key for Code Exchange)

PKCE prevents authorization code interception attacks:

1. Generate random `code_verifier` (43-128 chars)
2. Create `code_challenge` = BASE64URL(SHA256(code_verifier))
3. Send `code_challenge` with authorization request
4. Send `code_verifier` with token exchange request

### RFC 6750 - Bearer Token Usage

After obtaining a token, include it in requests:
```
Authorization: Bearer <access_token>
```

Servers may return `401 Unauthorized` with:
```
WWW-Authenticate: Bearer realm="mcp", authorization_uri="https://..."
```

---

## Understanding Platform Responses

When using the `connect_to_mcp_server` tool, the platform returns one of three statuses:

### Status: `success`

```json
{
  "status": "success",
  "serverName": "server-name",
  "tools": [{"name": "tool1", "description": "..."}]
}
```

**Action:** Server is connected. Proceed to use its tools.

---

### Status: `requires_oauth_config`

```json
{
  "status": "requires_oauth_config",
  "serverName": "server-name",
  "authType": "oauth2",
  "oauthDiscovery": {
    "authorizationEndpoint": "https://auth.example.com/authorize",
    "tokenEndpoint": "https://auth.example.com/token",
    "issuer": "https://auth.example.com",
    "suggestedClientId": "mcp-server",
    "suggestedRedirectUri": "http://localhost:3000/api/mcp/oauth/callback",
    "suggestedScope": "mcp:tools openid profile",
    "scopes": ["mcp:tools","openid", "profile"],
    "needsClientSecret": true
  }
}
```

**Action:** OAuth discovered but needs user confirmation of configuration. See Workflow below.

**Fields:**
- `oauthDiscovery.suggestedClientId`: **SUGGESTED** OAuth client ID (default: "mcp-server") - user can override with their own
- `oauthDiscovery.suggestedRedirectUri`: **SUGGESTED** callback URL for your platform - user can override if needed
- `oauthDiscovery.suggestedScope`: **SUGGESTED** OAuth scope string (may be empty) - user can override or use "" for no scopes
- `oauthDiscovery.scopes`: **SUGGESTED** OAuth scopes as array (for reference) - user can override or use empty string "" for no scopes
- `oauthDiscovery.needsClientSecret`: If true, you MUST ask the user for clientSecret (required for confidential OAuth clients)
- `oauthDiscovery.authorizationEndpoint`: The discovered OAuth authorization endpoint
- `oauthDiscovery.tokenEndpoint`: The discovered OAuth token endpoint

> [!NOTE]
> All "suggested" values are just defaults. The user can provide any custom values they want, especially if they have registered their own OAuth client with the provider.

> [!IMPORTANT]
> Always ask for `clientSecret` when `needsClientSecret` is true. Most OAuth servers (Keycloak, Auth0, etc.) require it.

---

### Status: `requires_auth`

```json
{
  "status": "requires_auth",
  "serverName": "server-name",
  "authType": "oauth2",
  "authUrl": "https://auth.example.com/authorize?...",
  "helpfulSkills": [{"id": "mcp-server-oauth", "name": "..."}]
}
```

**Action:** User must authorize access. See Workflow below.

**Fields:**
- `authType`: The authentication type (e.g., "oauth2", "oauth2-bearer", "unknown")
- `authUrl`: The URL user must visit to authenticate (may be null if discovery failed)
- `helpfulSkills`: Skills that may provide additional guidance

---

### Status: `error`

```json
{
  "status": "error",
  "serverName": "server-name",
  "error": "Connection failed: ...",
  "helpfulSkills": [{"id": "skill-id", "name": "..."}]
}
```

**Action:** Check error message. Authentication may still be required.

---

## Workflow

### Phase 1: Attempt Connection

Use the platform's connection mechanism (e.g., `connect_to_mcp_server` tool).

```
Connect to the [server-name] MCP server
```

### Phase 2: Handle `requires_oauth_config` Response (Two-Step Flow)

When the platform returns `status: requires_oauth_config`, OAuth was discovered but the platform needs user confirmation of the OAuth configuration before proceeding.

**Step 1: Present the discovered configuration to the user**

Show the **SUGGESTED** values and ask for confirmation or custom values. These are just suggestions - the user can provide any values they want:

> "I discovered OAuth configuration for **[serverName]**.
>
> Here are the **suggested** values (you can use these or provide your own):
> - **Client ID**: `[suggestedClientId]` ← you can override this
> - **Redirect URI**: `[suggestedRedirectUri]` ← you can override this
> - **Scope**: `[suggestedScope]` ← you can override this (or use empty string "" for no scopes)
> - **Client Secret**: **REQUIRED** ← you must provide this (not suggested, this is mandatory for most OAuth servers)
>
> **IMPORTANT**: I need the `clientSecret` to complete the OAuth flow. This is not optional for confidential OAuth clients like Keycloak.
>
> Would you like to use the suggested clientId/redirectUri/scope values, or provide custom ones?"

**Step 2: Get user confirmation or custom values**

**IMPORTANT**: The suggested values are just defaults. Accept ANY values the user provides:

The user may:
- Accept the suggested values as-is
- **Override ANY field** with custom values:
  - Custom `clientId` (e.g., "mcp-server", "my-custom-client") - especially if they registered their own OAuth app
  - Custom `redirectUri` (e.g., different host/port)
  - Custom `scope` (e.g., "openid profile" or empty string "" for no scopes)
  - Custom `clientSecret` (required for **confidential clients** like Keycloak - leave empty for public clients)

> [!TIP]
> If the OAuth provider rejects the discovered scopes (e.g., "invalid_scope" error),
> try using an empty string "" for scope, or ask the user what scopes are valid.

> [!IMPORTANT]
> **Confidential vs Public Clients:**
> - **Public clients** (like browser apps): No client secret needed, uses PKCE only
> - **Confidential clients** (like Keycloak): Requires a client secret for token exchange
> - If token exchange fails with "invalid_client" error, ask user for the client secret

**Step 3: Retry with OAuth configuration**

Call `connect_to_mcp_server` again, passing the confirmed configuration:

```json
{
  "serverName": "server-name",
  "clientId": "user-provided-or-suggested",
  "redirectUri": "user-provided-or-suggested",
  "scope": "openid profile",
  "clientSecret": "optional-for-confidential-clients"
}
```

Use `scope: ""` (empty string) if no scopes should be requested.
Omit `clientSecret` for public clients, or provide it for confidential clients (like Keycloak).

This will return `status: requires_auth` with the actual `authUrl` to present to the user.

---

### Phase 3: Handle `requires_auth` Response

When the platform returns `status: requires_auth`:

#### If `authUrl` is present

**Step 1: Present the URL to the user**

Display the authentication URL as a clickable link:

> "To use the **[serverName]** MCP server, you need to authorize access.
>
> Please click this link to authenticate: [authUrl]"

**Step 2: STOP and wait for user confirmation**

> [!CRITICAL]
> **STOP EXECUTION HERE!** Do not automatically retry or loop.

After presenting the URL:
1. **Explicitly ask** the user to confirm when done:
   > "Please let me know when you've completed the authentication."
2. **DO NOT:**
   - ❌ Automatically retry the connection
   - ❌ Poll or loop waiting for authentication
   - ❌ Present the URL multiple times
   - ❌ Assume authentication is complete without user confirmation

### Phase 4: Resume and Complete Task

Once the user confirms authentication is complete, perform the following in a continuous sequence:

1. **Re-establish Connection**: Attempt to connect to the MCP server again.
2. **Complete Original Task**: If successful, immediately use the server's tools to fulfill the user's initial request (e.g., "list incidents").

**[CRITICAL]**: Proceed through these steps automatically. Once the user provides confirmation that they have authenticated, the user-blocking portion of the workflow is done. Do NOT stop or ask for further permission before finishing the task. Continuous execution is expected.

#### If `authUrl` is null

The platform could not discover the OAuth endpoint. Options:

1. Check `helpfulSkills` for server-specific guidance
2. Check the server's documentation
3. Ask the user if they have authentication credentials

---

## Platform Adaptation Notes

> [!NOTE]
> This skill provides agent-agnostic guidance. Different platforms may handle
> the underlying OAuth mechanics differently.

### How the Platform Handles OAuth

The platform implements RFC 6750 (Bearer Token) and RFC 8414 (OAuth Authorization Server Metadata):

1. **Detection**: When connecting to an MCP server, if the server returns 401, the platform parses the `WWW-Authenticate` header
2. **Discovery**: The platform fetches OAuth metadata from `.well-known/oauth-authorization-server`
3. **URL Generation**: The platform constructs the authorization URL with PKCE
4. **Token Exchange**: After user authorization, the platform exchanges the code for a token
   - **Public clients**: Uses PKCE with `client_id` in request body
   - **Confidential clients**: Uses HTTP Basic Authentication (`Authorization: Basic base64(clientId:clientSecret)`) per OAuth 2.0 spec
5. **Injection**: Subsequent requests automatically include the Bearer token

**As an agent, you don't need to implement OAuth yourself** - the platform handles it. Your job is to:
- Present the `authUrl` to the user
- Wait for confirmation
- Retry the connection

### Session Persistence & Custom Headers

Some complex Agent Skills Workbenches (like TMF724) may require a session-related header (e.g., `mcp-session-id`) in addition to the OAuth token. While this skill focuses on tokens, always check for session-related headers in the initialization response if authentication succeeds but subsequent tool calls fail.

### Script-Based OAuth (Nango)

Some MCP servers use script-based OAuth (like Nango). For these:

1. The `connect_to_mcp_server` response may point to skills like `connect-to-nango-mcp`
2. Check the `helpfulSkills` array for server-specific skills
3. Use `get_skill` to read the skill content for detailed instructions

---

## Portable Scripts (Platform-Agnostic)

These scripts implement the complete OAuth flow and can run on **any platform with Node.js 18+**. Use these when your platform doesn't have built-in OAuth handling.

### scripts/discover-oauth.js

Discovers OAuth metadata from an MCP server using RFC 8414.

**Usage:**
```bash
node discover-oauth.js https://mcp.example.com
```

**Output:**
```json
{
  "status": "discovered",
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "scopes_supported": ["openid", "profile"],
  "discovery_url": "https://auth.example.com/.well-known/oauth-authorization-server"
}
```

**What it does:**
1. Tries `.well-known/oauth-authorization-server` on the server URL
2. Falls back to `.well-known/openid-configuration`
3. If server returns 401, parses `WWW-Authenticate` header for auth server URL
4. Returns discovered endpoints or `status: "not_found"`

---

### scripts/build-auth-url.js

Builds an OAuth authorization URL with PKCE (RFC 7636).

**Usage:**
```bash
node build-auth-url.js https://auth.example.com/authorize \
  --client-id=my-client \
  --redirect-uri=http://localhost:3000/callback \
  --scope="openid profile"
```

**Output:**
```json
{
  "status": "success",
  "authorization_url": "https://auth.example.com/authorize?response_type=code&client_id=my-client&...",
  "state": "random-state-value",
  "code_verifier": "pkce-code-verifier-SAVE-THIS",
  "code_challenge": "pkce-code-challenge",
  "code_challenge_method": "S256",
  "client_id": "my-client",
  "redirect_uri": "http://localhost:3000/callback",
  "scope": "openid profile"
}
```

**IMPORTANT:** Save the `code_verifier` - you need it for token exchange!

---

### scripts/exchange-token.js

Exchanges an authorization code for an access token.

**Usage (public client):**
```bash
node exchange-token.js https://auth.example.com/token \
  --code=AUTH_CODE_FROM_CALLBACK \
  --code-verifier=SAVED_CODE_VERIFIER \
  --client-id=my-client \
  --redirect-uri=http://localhost:3000/callback
```

**Usage (confidential client with secret):**
```bash
# Via environment variable (recommended - more secure)
OAUTH_CLIENT_SECRET=my-secret node exchange-token.js https://auth.example.com/token \
  --code=AUTH_CODE_FROM_CALLBACK \
  --code-verifier=SAVED_CODE_VERIFIER \
  --client-id=my-client \
  --redirect-uri=http://localhost:3000/callback

# Or via command line
node exchange-token.js https://auth.example.com/token \
  --code=... --code-verifier=... --client-id=... --redirect-uri=... \
  --client-secret=my-secret
```

**Output:**
```json
{
  "status": "success",
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expires_at": "2025-01-18T12:00:00.000Z",
  "usage": {
    "header": "Authorization: Bearer eyJ...",
    "note": "Include this header in requests to the MCP server"
  }
}
```

---

### scripts/check-oauth-status.js

Quick connectivity check - determines if a server requires OAuth.

**Usage:**
```bash
node check-oauth-status.js <mcp-server-url>
```

**Inputs:**
- Argument 1: The MCP server URL to check

**Output:** JSON to stdout
```json
{
  "status": "available|requires_auth|error",
  "authUrl": "https://...",
  "authType": "oauth2|unknown",
  "message": "..."
}
```

---

---

## Portable Script Workflow (Any Platform)

For agents on platforms **without** built-in OAuth handling, use the bundled scripts directly.

### Complete Flow Example

```bash
# Step 1: Discover OAuth configuration
node scripts/discover-oauth.js https://mcp.example.com
# Returns: authorization_endpoint, token_endpoint, etc.

# Step 2: Build authorization URL with PKCE
node scripts/build-auth-url.js https://auth.example.com/authorize \
  --client-id=my-client \
  --redirect-uri=http://localhost:3000/callback \
  --scope="mcp:tools"
# Returns: authorization_url, code_verifier (SAVE THIS!)

# Step 3: Present authorization_url to user
# User visits URL, authenticates, gets redirected to callback with ?code=...

# Step 4: Exchange code for token
node scripts/exchange-token.js https://auth.example.com/token \
  --code=AUTHORIZATION_CODE \
  --code-verifier=SAVED_VERIFIER \
  --client-id=my-client \
  --redirect-uri=http://localhost:3000/callback
# Returns: access_token

# Step 5: Use the token
# Include header: Authorization: Bearer <access_token>
```

### For Agent Developers

The portable scripts allow you to implement MCP OAuth on any platform:

1. **Clone/copy the scripts** to your agent's execution environment
2. **Run `discover-oauth.js`** when connecting to a new MCP server
3. **Run `build-auth-url.js`** to generate the auth URL with PKCE
4. **Present the URL** to your user and wait for callback
5. **Run `exchange-token.js`** with the authorization code
6. **Store and inject** the token in subsequent MCP requests

This works with Claude Desktop, Cursor, custom agents, or any environment with Node.js 18+.

---

## Platform-Integrated Workflow (agent-skills-workbench)

The following section documents the response format used by platforms with built-in OAuth handling.

---

## Common Patterns

### Pattern A: OAuth with Config Confirmation (Recommended)

```
1. connect_to_mcp_server({ serverName: "incident-manager" })
   → Returns: {
       status: "requires_oauth_config",
       oauthDiscovery: {
         suggestedClientId: "mcp-server",
         suggestedRedirectUri: "http://localhost:3000/api/mcp/oauth/callback",
         scopes: ["mcp:tools", "openid", "email", "profile"],
         authorizationEndpoint: "https://auth.example.com/authorize"
       }
     }

2. Present config to user:
   "OAuth discovered! Use:
    - clientId: 'mcp-server'
    - redirectUri: 'http://localhost:3000/api/mcp/oauth/callback'
    - scope: 'mcp:tools openid email' (or empty for no scopes)?"

3. User confirms (or provides custom values, e.g., scope: "" for no scopes, clientSecret: "..." for confidential clients)

4. connect_to_mcp_server({
     serverName: "incident-manager",
     clientId: "mcp-server",
     redirectUri: "http://localhost:3000/api/mcp/oauth/callback",
     scope: "",
     clientSecret: "optional-secret-for-confidential-clients"
   })
   → Returns: { status: "requires_auth", authUrl: "https://..." }

5. Present authUrl to user AS A CLICKABLE LINK, wait for confirmation

6. connect_to_mcp_server({ serverName: "incident-manager" })
   → Returns: { status: "success", tools: [...] }
```

### Pattern B: No OAuth Discovery

```
1. connect_to_mcp_server("custom-server")
   → Returns: { status: "requires_auth", authUrl: null, authType: "unknown" }

2. Check helpfulSkills for guidance

3. If helpfulSkills contains a server-specific skill:
   - Use get_skill to read instructions
   - Follow the skill's authentication workflow

4. If no helpful skills:
   - Ask user for authentication details
   - Check server documentation
```

### Pattern C: Nango/Script-Based OAuth

```
1. connect_to_mcp_server("nango")
   → Returns: { status: "requires_auth", helpfulSkills: [{id: "connect-to-nango-mcp", ...}] }

2. get_skill("connect-to-nango-mcp")
   → Read the skill content

3. Follow the skill's bootstrap workflow:
   - Create sandbox with skillId
   - Run check-auth.js script
   - Present auth URL if needed
   - After user auth, run script again to get credentials
```

---

## Troubleshooting

**"Connection failed but no auth URL provided"**
→ The server may not support OAuth discovery
→ Check `helpfulSkills` for server-specific guidance
→ The server may use a non-standard authentication method

**"OAuth completed but still can't connect"**
→ The OAuth token may not have been captured correctly
→ Try clearing the authentication data and starting fresh (see below)
→ Check that the platform's callback URL is correctly configured

**"Stale or invalid authentication tokens"**
→ If authentication keeps failing even after completing the OAuth flow, the stored tokens may be stale or corrupted
→ **Solution: Clear all authentication data for the specific MCP server:**
  - Use the `clear_mcp_auth` tool: Call `clear_mcp_auth({"serverName": "your-server-name"})` to clear OAuth tokens, API keys, and server configuration
  - Alternatively, on platforms with the clear-auth API: Make a POST request to `/api/mcp/clear-auth` with `{"serverName": "your-server-name"}`
  - This clears authentication data for the specified server only
  - After clearing, retry the OAuth flow from the beginning with `connect_to_mcp_server`
→ **Important**: This only clears auth data for the specific server you specify - other MCP servers are unaffected

**"User authenticated but connection still fails"**
→ The authentication scope may be insufficient
→ Check if the server requires specific OAuth scopes
→ Some servers require additional headers beyond the Bearer token
→ Try clearing authentication data (see above) and re-authenticating with the correct scopes

**"authType is 'unknown'"**
→ The server returned 401/403 but no WWW-Authenticate header with OAuth metadata
→ Check `helpfulSkills` for manual authentication instructions
→ The server may use a custom authentication scheme

**"invalid_client" or "Invalid client credentials" during token exchange**
→ The OAuth server requires a client secret but none was provided
→ This happens with **confidential clients** (common in Keycloak, Auth0, etc.)
→ Ask the user for the client secret and retry with `clientSecret` parameter
→ Alternatively, the user can reconfigure the OAuth client as a "public client" in their OAuth provider

**"insufficient_scope" after successful authentication**
→ The token was obtained but doesn't have the scopes required by the server
→ The platform automatically clears the invalid token
→ You'll receive a new `requires_oauth_config` response with the server-required scope
→ Show the user the **new required scope** and ask them to re-authenticate with it
→ Example: User authenticated with `scope: "mcp:tools"` but server also requires `scope: "email openid"`

**Competing Listener Problem**

If the authorization code is frequently returned as 'invalid' or 'expired' after a successful user login, ensure there are no other active listeners on the Redirect URI that might be consuming the code automatically upon redirect.

*Example:* If your `redirectUri` is `http://localhost:3000/callback` and you have a local dev server running on port 3000, it might "steal" the code before the agent/platform can process it.

*Solution:* Use a neutral URL or temporarily stop the local listener.

---

## Related Skills

- **connect-to-nango-mcp**: OAuth via Nango for SaaS integrations (HubSpot, Salesforce)
- **create-incident**: Example skill using an OAuth-protected MCP server
