# Skill Authoring Guidelines

This document provides guidelines for writing cross-platform, agent-agnostic skills that work across different AI coding agents (Claude Code, Gemini CLI, Cursor, context-serve platform, etc.).

## Core Philosophy

> **Skills are declarative contracts, not procedural instructions.**
> 
> The skill says: "I need X capability with Y configuration."
> The agent says: "I have X capability, here's how I'll provide it."

This separation keeps skills portable while allowing agents to optimize for their specific runtime environment.

---

## The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTABLE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  SKILL.md          │  Describes WHAT to do                  │
│                    │  - Workflow steps in natural language  │
│                    │  - Script inputs/outputs               │
│                    │  - When to use each script             │
├─────────────────────────────────────────────────────────────┤
│  scripts/          │  Portable code resources               │
│                    │  - Self-contained (minimal deps)       │
│                    │  - Standard runtimes (Node.js, Python) │
│                    │  - Runs anywhere the runtime runs      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 PLATFORM ADAPTER LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  Agent Code        │  Translates abstract → concrete        │
│                    │  - "run script" → sandbox/docker/local │
│                    │  - Mount scripts to execution env      │
│                    │  - Parse script output                 │
│                    │  - Provision credentials               │
└─────────────────────────────────────────────────────────────┘
```

**Key insight**: The skill describes WHAT; the agent figures out HOW.

---

## Core Principles

### 1. Describe WHAT, Not HOW

Say what needs to happen, not how to do it.

```markdown
✅ GOOD:
"Run the bundled `scripts/check-auth.js` script with the provider name"

❌ BAD:
"Create a Vercel sandbox and execute: create_sandbox({ skillId: 'my-skill' })"
```

### 2. Use Natural Language

Any agent should be able to read and follow your instructions.

```markdown
✅ GOOD:
"If the user is not authenticated, present them with the authentication URL."

❌ BAD:
"Call the notify_user tool with the authUrl parameter."
```

### 3. Bundle Self-Contained Scripts

Scripts should have minimal dependencies and use standard runtimes.

```javascript
// ✅ GOOD: Uses only Node.js built-in fetch (Node 18+)
const response = await fetch(url, { headers });

// ❌ BAD: Requires installing axios
const response = await axios.get(url);
```

### 4. Declare Requirements in Frontmatter

Use machine-readable frontmatter for discovery and validation.

```yaml
---
name: my-skill
description: What this skill does
version: 1.0.0
mcp-servers: ["server-name"]  # Declarative dependency
requires:
  runtime: node >= 18
  mcp:
    - server: nango
      transport: http
tags: [integration, oauth]
---
```

### 5. Provide Platform Hints, Not Prescriptions

Suggest approaches without mandating specific implementations.

```markdown
✅ GOOD:
"For agents with static MCP configuration, save credentials 
and instruct the user to add the MCP server entry to their config."

❌ BAD:
"Edit ~/.claude.json and add the following to mcpServers..."
```

---

## SKILL.md File Structure

### Recommended Template

```markdown
---
name: skill-name
description: Brief description of what this skill does
version: 1.0.0
author: Your Name
mcp-servers: ["required-server"]
tags: [category, integration, ...]
---

# Skill Name

One-paragraph description of what this skill enables.

## Prerequisites

### Environment Variables
- `ENV_VAR` (required): Description of what it's for
- `OPTIONAL_VAR` (optional): Description with default

### Runtime
- Node.js 18+ (for bundled scripts)
- Python 3.9+ (if applicable)

### MCP Server Dependencies
This skill requires the **Server Name** MCP server.
- **Transport**: HTTP
- **URL**: `https://api.example.com/mcp`
- **Authentication**: Bearer token via `Authorization` header

## Workflow

### Phase 1: [First Major Step]
Description of what happens in this phase.

1. [Substep with clear action]
2. [Substep with expected output]

### Phase 2: [Second Major Step]
...

---

## Platform Adaptation Notes

> [!NOTE]
> This section provides hints for different agent platforms. Agents 
> should match their capabilities to the appropriate pattern.

### Dynamic MCP Support
For agents that can add MCP servers during a session:
- No configuration file needed
- Connect directly with authentication headers

### Static MCP Configuration  
For agents requiring config file + restart:
1. Save credentials to persistent storage
2. Generate config file entry
3. Instruct user to update config and restart

### Script Execution
Scripts are self-contained and require:
- Standard runtime (Node.js/Python)
- Environment variables for configuration
- Ability to capture JSON from stdout

---

## Bundled Scripts

### scripts/script-name.js

Brief description of what this script does.

**Usage:**
\`\`\`bash
node script-name.js <arg1> [arg2]
\`\`\`

**Inputs:**
- Argument 1: Description
- Argument 2 (optional): Description

**Environment Variables:**
- `ENV_VAR` (required): Description

**Output:** JSON to stdout
\`\`\`json
{
  "status": "success|error|needs_auth",
  "data": "..."
}
\`\`\`

---

## Troubleshooting

**Common Issue 1**
→ Resolution steps

**Common Issue 2**
→ Resolution steps
```

---

## Patterns to Avoid

### ❌ Platform-Specific Tool Syntax

```markdown
BAD: "Call create_sandbox({ skillId: 'my-skill' })"
BAD: "Use the run_command tool with args: ['node', 'script.js']"
```

### ❌ Hardcoded Config File Paths

```markdown
BAD: "Edit ~/.claude.json"
BAD: "Modify .cursor/mcp.json"
```

### ❌ Agent-Specific CLI Commands

```markdown
BAD: "Run: claude mcp add nango https://..."
BAD: "Execute: gemini --mcp-server ..."
```

### ❌ Execution Environment Assumptions

```markdown
BAD: "Scripts are auto-mounted to /scripts/"
BAD: "The sandbox will have npm available"
```

---

## Portable Patterns to Use

### ✅ Natural Language Script Instructions

```markdown
GOOD: "Run the bundled `scripts/check-auth.js` script"
GOOD: "Execute the config helper script with the 'generate' command"
```

### ✅ Declarative MCP Requirements

```markdown
GOOD: "This skill requires the Nango MCP server with HTTP transport"
GOOD: "The MCP server needs these headers at connection time: Authorization, connection-id"
```

### ✅ JSON I/O Contracts

```markdown
GOOD: "The script outputs JSON with: status, connectionId, message"
GOOD: "Parse the JSON response and check the 'status' field"
```

### ✅ Capability-Based Branching

```markdown
GOOD: "For agents with dynamic MCP support, connect immediately.
       For agents requiring static config, save credentials and restart."
```

---

## Handling User-Blocking Actions

When a workflow requires user action (like clicking an OAuth link), you **must** instruct agents to:

1. **Present the action ONCE** - Don't retry in a loop
2. **STOP and WAIT** - Explicitly tell the agent to pause until user confirms
3. **Request explicit confirmation** - Ask the user to confirm they've completed the action

### The Problem

Without clear guidance, agents will:
```
❌ Run auth check → Get "needs_auth" → Present URL → Immediately retry
   → Get "needs_auth" → Present URL → Retry again → Loop forever
```

### The Solution

Be explicit in your skill documentation:

```markdown
✅ GOOD:
"If authentication is needed:
1. Present the authentication URL to the user as a clickable link
2. **STOP EXECUTION** - Do not proceed or retry automatically
3. Ask the user to confirm when they have completed the OAuth flow
4. Only after user confirmation, re-run the auth check script"
```

### Pattern for Authentication Flows

```markdown
## Handling Authentication Response

**If `status: needs_auth`:**

1. Present the `authUrl` to the user:
   "Please authenticate by visiting: [authUrl]"

2. **STOP AND WAIT** for user confirmation:
   - Do NOT automatically retry the auth check
   - Do NOT poll or loop waiting for authentication
   - Explicitly ask: "Please let me know when you've completed the authentication"

3. Only when the user confirms they've authenticated:
   - Re-run the auth check script
   - If still `needs_auth`, present the new URL and wait again
```

> [!IMPORTANT]
> **Never retry user-blocking actions automatically!** OAuth flows, email 
> confirmations, manual approvals, and similar actions require explicit 
> user confirmation before retrying. Looping wastes resources and 
> frustrates users.

---

## MCP Server Requirements

When your skill depends on MCP servers, document them declaratively:

### What to Include

1. **Server Name**: The identifier for the MCP server
2. **Transport Type**: HTTP, SSE, or stdio
3. **URL**: The server endpoint
4. **Authentication**: What headers/credentials are needed
5. **Available Tools**: Brief list of tools the server provides

### What NOT to Include

- Specific CLI commands for adding the server
- Config file paths for specific agents
- Platform-specific connection procedures

### Example

```markdown
## MCP Server Requirements

This skill requires the **Nango** MCP server.

**Server Details:**
- Transport: HTTP
- URL: `https://api.nango.dev/mcp`

**Required Headers (at connection time):**
- `Authorization`: Bearer <secret_key>
- `connection-id`: <connection_id from OAuth>
- `provider-config-key`: <provider name>

**Available Tools:**
- `whoami`: Check connected account
- `list_contacts`: List CRM contacts
- `query`: Execute custom queries
```

### OAuth-Protected MCP Servers

Some MCP servers require OAuth authentication before they can be used. When documenting such servers:

1. **Declare the auth requirement** - Note that OAuth is required
2. **Don't specify the OAuth flow** - The platform handles OAuth discovery
3. **Document what happens after auth** - What tools become available

**Example for OAuth-Protected Server:**

```markdown
## MCP Server Requirements

This skill requires the **Incident-Management-v4** MCP server.

> [!IMPORTANT]
> This server is **OAuth-protected**. When connecting, the platform will:
> 1. Return a `requires_auth` status with an authorization URL
> 2. The agent should present this URL to the user
> 3. After user authorization, retry the connection

**Server Details:**
- Transport: HTTP
- URL: Configured in MCP registry

**Authentication:**
- Type: OAuth 2.0
- Handled by: Platform (see `mcp-server-oauth` skill for details)

**Available Tools (after authentication):**
- `createIncident`: Create a new incident
- `listIncidents`: List existing incidents
```

**Key Pattern**: Don't prescribe HOW to do OAuth - describe THAT OAuth is required and what the outcome looks like.

For detailed OAuth handling instructions, see the `mcp-server-oauth` skill.

---

## Script Guidelines

### Self-Contained

```javascript
// ✅ Use only Node.js built-in modules
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ✅ Use built-in fetch (Node 18+)
const response = await fetch(url);
```

### Standard I/O

```javascript
// Input: Command-line arguments
const provider = process.argv[2] || 'default';

// Input: Environment variables  
const apiKey = process.env.API_KEY;

// Output: JSON to stdout
console.log(JSON.stringify({
  status: 'success',
  data: result
}));

// Exit codes
process.exit(0);  // Success
process.exit(1);  // Error
```

### Clear Error Handling

```javascript
try {
  // ... operation
} catch (error) {
  console.log(JSON.stringify({
    status: 'error',
    message: error.message
  }));
  process.exit(1);
}
```

---

## Testing Your Skill

### Portability Checklist

- [ ] No platform-specific tool syntax in SKILL.md
- [ ] No hardcoded config file paths
- [ ] Scripts use only standard runtime features
- [ ] All dependencies are bundled or use built-ins
- [ ] MCP requirements are documented declaratively
- [ ] Platform Adaptation Notes are provided (if applicable)

### Cross-Platform Testing

Test your skill on multiple agents if possible:
- Your platform (dynamic MCP support)
- Claude Code (static config + restart)
- Cursor (static config + restart)
- Local execution (direct script running)

---

## Summary

| Aspect | DO | DON'T |
|--------|----|----|
| Instructions | Natural language | Tool-specific syntax |
| Scripts | Self-contained | External dependencies |
| MCP servers | Declarative requirements | Connection procedures |
| Execution | Describe expected behavior | Dictate sandbox tech |
| Config paths | Agent-agnostic hints | Hardcoded locations |

**Remember**: Your skill is a contract. Say what you need, not how to get it. Let each agent implement the contract using its own capabilities.
