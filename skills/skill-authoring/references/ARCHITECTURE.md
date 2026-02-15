# Skills Architecture

This document describes the separation of concerns between skills, scripts, and platform-specific agent code.

## Overview

The architecture has three distinct layers shown below:

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTABLE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  skill.md          │  Describes WHAT to do                  │
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

## Layer 1: Skills (Portable)

Skills are **documentation for agents** stored as markdown files with YAML frontmatter.

### What Skills Should Contain

✅ **DO include:**
- Natural language workflow descriptions
- Prerequisites and requirements
- Script documentation (inputs, outputs, environment variables)
- Error handling guidance
- Best practices and tips

❌ **DON'T include:**
- Platform-specific tool call syntax (`create_sandbox`, `run_command`)
- Execution environment details (Docker, Vercel, Lambda)
- API call examples with specific tool signatures

### Example Skill Structure

```
skills/
└── my-integration/
    ├── skill.md           # Workflow documentation
    ├── scripts/
    │   └── check-auth.js  # Portable script
    ├── references/        # API docs, specs
    ├── scenarios/         # Test scenarios
    └── examples/          # Usage examples
```

### Example Skill Content

```markdown
## Workflow

### Step 1: Check Authentication
Run the bundled `scripts/check-auth.js` with the provider name.

**Input:** Provider name (e.g., "hubspot")
**Output:** JSON with status, connectionId or authUrl

### Step 2: Handle Response
- If authenticated: Use connectionId for API calls
- If needs_auth: Present authUrl to user
```

Notice: No mention of HOW to run the script - that's platform-specific.

## Layer 2: Scripts (Portable)

Scripts are **executable code** bundled with skills that perform specific tasks.

### Script Guidelines

1. **Self-contained**: Minimize external dependencies
2. **Standard I/O**: Use stdin/stdout/stderr and exit codes
3. **JSON output**: Return structured data that's easy to parse
4. **Environment variables**: Use env vars for configuration
5. **Cross-platform**: Avoid OS-specific features when possible

### Example Script

```javascript
// scripts/check-auth.js
// Self-contained - uses only Node.js built-in fetch

const provider = process.argv[2] || 'hubspot';
const secretKey = process.env.NANGO_SECRET_KEY;

// ... perform authentication check ...

// Output JSON to stdout
console.log(JSON.stringify({
  status: 'success',
  connectionId: 'abc123'
}));
```

## Layer 3: Platform Adapter (Non-Portable)

The agent code translates abstract skill instructions into platform-specific actions.

### Responsibilities

| Abstract Concept | Platform Implementation |
|-----------------|------------------------|
| "Run script X" | Create sandbox, mount files, execute |
| "Need env var Y" | Provision from secrets store |
| "Parse output" | Read stdout, parse JSON |
| "Handle auth URL" | Present to user via UI |
| "Connect to MCP server" | Check connectivity, detect OAuth, handle auth flow |
| "Server requires OAuth" | Extract auth URL, return structured response, wait for user |

### Example: Vercel Sandbox Adapter

When a skill says "run `check-auth.js hubspot`", the platform:

1. Creates a Vercel sandbox with `create_sandbox({ skillId: "skill-name" })`
2. Scripts are auto-mounted to `/scripts/`
3. Credentials are provisioned from environment
4. Executes with `run_command({ command: "node", args: ["scripts/check-auth.js", "hubspot"] })`
5. Parses JSON from stdout

### Example: OAuth-Protected MCP Server Connection

When a skill says "connect to the Incident-Management-v4 MCP server", the platform:

1. Attempts to connect to the configured server URL
2. If the server returns 401/403:
   - Extracts OAuth URL from `WWW-Authenticate` header, `Link` header, or response body
   - Returns `{ status: "requires_auth", authUrl: "...", instructions: "..." }`
3. Agent presents the auth URL to the user and **waits for confirmation**
4. After user confirms, agent retries connection
5. On success, returns available tools

This pattern keeps OAuth complexity in the platform while skills remain declarative.

### Other Possible Adapters

- **Docker**: Mount scripts as volume, run container
- **Local**: Execute directly on host machine
- **Lambda**: Package scripts, invoke function
- **Kubernetes**: Create job with script

## Skill Builder Workflow

The Skill Builder Agent helps users create portable skills through dialogue:

### Phase 1: Discovery
- Understand user's goal
- Check for existing skills that solve the problem
- Identify if new skill is needed

### Phase 2: Iterative Refinement
- Draft skill content collaboratively
- Create/refine scripts as needed
- **Create supporting directories dynamically** as needed:
  - `scripts/` - When adding executable scripts
  - `examples/` - When adding usage examples
  - `references/` - When adding API docs, specs, or reference material
  - `assets/` - When adding images, diagrams, or other media
  - Only create directories when you have content to put in them (no empty scaffolding)
- Test the workflow by executing steps
- Refine based on results

**IMPORTANT**: Don't assume directories exist. If you need to write a script but the `scripts/` directory doesn't exist yet, create it first. Same for `examples/`, `references/`, and `assets/`. Skills may start minimal and grow over time.

### Phase 3: Save & Publish
- When workflow succeeds, suggest saving
- Publish skill to `/skills/{skill-id}/`
- Provide edit link for further refinement

### Phase 4: Test & Improve
- Generate test scenarios
- Run scenarios to validate skill
- Iterate based on test results

## MCP Server Requirements

Skills that depend on MCP (Model Context Protocol) servers should document their requirements **in the skill content** using natural language that any agent can understand.

### Why Natural Language?

Different agent platforms handle MCP server connections differently:

| Platform | How to Add MCP Server |
|----------|----------------------|
| Claude Desktop | `claude mcp add --transport http server-name https://server.url/mcp` |
| Cursor | Edit `.cursor/mcp.json` or use settings UI |
| Custom Agents | Programmatic APIs or configuration files |

Since there's no universal standard for MCP configuration, skills should be **declarative, not prescriptive**:
- ✅ Describe WHAT server is needed and WHY
- ❌ Don't specify HOW to connect (that's platform-specific)

### Documentation Pattern

Include an "MCP Server Requirements" section in your skill content:

```markdown
## MCP Server Requirements

This skill requires the **[Server Name]** MCP server.

**What it provides:**
- `tool_a` - Does X
- `tool_b` - Does Y

**Connection:**
If not already connected, add this MCP server to your agent's MCP configuration.

**Authentication (if applicable):**
This server requires [describe auth]. See the "Authentication" section below.
```

### For Skill Authors

When writing a skill that uses MCP servers:

1. **Document in the skill content** - Any agent can read natural language
2. **Explain the purpose** - What tools does the server provide?
3. **Describe authentication** - If the server or its tools require auth
4. **Be platform-agnostic** - Don't include specific CLI commands or config paths

### Frontmatter vs. Content: What Goes Where

| Information | Where | Why |
|-------------|-------|-----|
| MCP server names | Frontmatter `mcp-servers` | Platform tools can parse this |
| MCP server purpose/usage | Skill content text | Any agent can read this |
| Authentication workflow | Skill content text | Step-by-step instructions |
| Script documentation | Skill content text | Explains inputs/outputs |

**Principle:** Frontmatter is for machines that understand our conventions. Content is for any agent that reads markdown.

---

## Benefits

1. **Portability**: Skills work across different agent platforms
2. **Reusability**: Scripts can be shared and composed
3. **Testability**: Clear inputs/outputs enable automated testing
4. **Maintainability**: Changes to platform don't require skill updates
5. **Discoverability**: Skills are self-documenting markdown files

---

## Related Documentation

- **[SKILL_AUTHORING.md](./SKILL_AUTHORING.md)**: Detailed guidelines for creating cross-platform, agent-agnostic skills

