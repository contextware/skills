---
name: skill-authoring
description: Helps agents author cross-platform, portable skills following best practices
version: 2.1.0
author: agent-skills-workbench
mcp-servers: []
allowed-tools: [get_skill, list_skill_assets, read_skill_asset]
tags: [meta, authoring, guidelines, portable]
---

# Skill Authoring Skill

This skill helps you author new skills that are cross-platform and agent-agnostic. Use this when creating or reviewing skill definitions.

## Prerequisites

**Required Reading:**
Review the [SKILL_AUTHORING.md](./references/SKILL_AUTHORING.md) guidelines for comprehensive authoring practices.

## Workflow

### Phase 1: Understand the Goal

Before writing a skill, clarify:
1. **What capability** does this skill provide?
2. **What prerequisites** are needed (env vars, runtime, MCP servers)?
3. **What scripts** are needed to perform the work?
4. **What output** should the agent produce?

### Phase 2: Create the SKILL.md Structure

Every skill needs a `SKILL.md` file with frontmatter:

```yaml
---
name: skill-name
description: Brief description
version: 1.0.0
mcp-servers: ["server-name"]  # Required MCP servers, use [] if none needed
allowed-tools: [tool1, tool2] # Tools the skill uses, enables lazy loading
tags: [category, ...]
---
```

> [!IMPORTANT]
> **Always specify `mcp-servers` and `allowed-tools`!**
> 
> - If your skill needs NO MCP servers, use `mcp-servers: []`
> - If your skill only needs specific tools, list them in `allowed-tools`
> 
> Without these fields, the agent falls into "Legacy Mode" which connects to ALL 
> MCP servers, wasting resources and causing unnecessary connection errors.

### Phase 3: Write the Workflow

Use these **core principles**:

1. **Describe WHAT, not HOW** - Say what needs to happen, not tool-specific syntax
2. **Use natural language** - Any agent should be able to read and follow
3. **Bundle self-contained scripts** - No external dependencies
4. **Declare requirements** - Use frontmatter for machine-readable deps
5. **Provide platform hints** - But as suggestions, not requirements
6. **Include reference MCP server URLs** - So agents without their own server can still proceed (see below)

### Phase 4: Create Bundled Scripts

Place scripts in the `scripts/` subdirectory. Scripts should:
- Use only built-in runtime features (Node.js fetch, fs, path)
- Accept input via command-line arguments and environment variables
- Output JSON to stdout
- Use proper exit codes (0 = success, 1 = error)

### Phase 5: Add Platform Adaptation Notes

If your skill has platform-specific considerations (like MCP configuration), add a section:

```markdown
## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session...

### Static MCP Configuration
For agents requiring config file + restart...
```

### Phase 6: Document MCP Server URLs for Portability

Skills that depend on MCP servers must help **other agents** find and connect to the right server. The agent consuming your skill may not have the same MCP servers configured locally.

**The pattern**: Describe what capabilities are needed, list the required tools, and provide a **reference MCP server URL** as a working default. Be permissive — let the consuming agent decide whether to use its own local server or the reference one.

When writing the MCP Server Requirements section of your skill, use this pattern:

```markdown
## MCP Server Requirements

This skill requires an MCP server that provides **[capability description]** (e.g., incident management, CRM integration).

**Required tools:** `toolA`, `toolB`, `toolC`

**Reference MCP Server:**
If you do not already have a locally configured MCP server that provides these tools, you can use the following reference endpoint:
- Transport: HTTP
- URL: `https://<server-name>.mcpgateway.online/mcp`

If you have your own MCP server that provides equivalent functionality, use that instead.
```

**Why this matters**: Without a reference URL, agents that don't have the server configured locally will stall — they have no way to proceed. With a reference URL, any agent can pick up the skill and start working immediately.

**Key principles**:
- **Be permissive**: Don't insist agents use the reference URL. If they have a local match, that's fine.
- **Don't be directive**: Don't tell agents they "must find their own server URL first" — this causes them to pick the wrong server or get stuck searching.
- **Describe capability, not identity**: Focus on what tools are needed, not a specific server name. This allows agents to match against their own servers by capability.

---

## Patterns to Avoid

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `create_sandbox({ skillId: "..." })` | "Run the bundled script" |
| `jq '.mcpServers = ...' ~/.claude.json` | "Add to your MCP configuration" |
| Specific config file paths | "Update your agent's MCP settings" |
| Tool-specific syntax | Natural language descriptions |

---

## Patterns to Use

| Pattern | Example |
|---------|---------|
| Script execution | "Run `scripts/check-auth.js hubspot`" |
| JSON contracts | "The script outputs JSON with {status, data}" |
| Declarative MCP | "Requires the 'nango' MCP server (HTTP transport)" |
| Capability hints | "For agents with dynamic MCP support..." |
| **User-blocking actions** | "Present the auth URL, then **STOP AND WAIT** for user confirmation" |
| **Reference MCP URLs** | "If you don't have a local server with these tools, use this reference endpoint: ..." |

---

## Example: Good vs Bad

### ❌ Bad (Platform-Specific)

```markdown
Create a Vercel sandbox using create_sandbox tool, then run:
run_command({ command: "node", args: ["scripts/auth.js"] })
```

### ✅ Good (Portable)

```markdown
Run the bundled `scripts/auth.js` script with the provider name.
The script outputs JSON indicating authentication status.
```

---

## Checklist Before Publishing

- [ ] `mcp-servers` specified (use `[]` if none needed)
- [ ] `allowed-tools` specified (enables lazy loading)
- [ ] No platform-specific tool syntax in SKILL.md
- [ ] No hardcoded config file paths
- [ ] Scripts use only standard runtime features  
- [ ] MCP requirements documented declaratively with reference URL
- [ ] Natural language workflow descriptions
- [ ] Platform Adaptation Notes included (if applicable)
- [ ] **User-blocking actions have explicit STOP AND WAIT instructions**
- [ ] Tested on at least one agent platform

---

## Resources

- [SKILL_AUTHORING.md](./references/SKILL_AUTHORING.md) - Full authoring guidelines
- [ARCHITECTURE.md](./references/ARCHITECTURE.md) - System architecture overview
- [mcp-server-oauth skill](../mcp-server-oauth/SKILL.md) - OAuth handling for protected MCP servers
