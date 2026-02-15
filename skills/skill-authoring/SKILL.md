---
name: skill-authoring
description: Helps agents author cross-platform, portable skills following best practices
version: 2.2.0
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

#### Tool Name Portability (B2)

When referencing MCP tools in workflow prose:
- **In `allowed-tools` frontmatter**: use full names (with platform prefix if needed)
- **In workflow prose**: use base tool name or capability description

Example:
- ❌ Bad: "Call the `nango-mcp-server_whoami` tool"
- ✅ Good: "Call the `whoami` tool"
- ✅ Better: "Verify authentication by checking user identity"

**Rationale**: The `{server}_{tool}` naming convention is a platform artifact. The actual tool on the MCP server is just the base name.

#### "HOW vs WHAT" Self-Check (B5)

After writing each workflow step, verify:
- ❌ No `curl`, `docker`, `npm`, or shell commands in workflow → move to `references/` or `scripts/`
- ❌ No vendor-prefixed tool names → use capability description
- ❌ No protocol details (JSON-RPC, SSE, HTTP headers) → move to `references/`
- ❌ No "obtain X from the web dashboard" → all inputs must be discoverable programmatically

If your workflow has any of these, you're describing HOW (implementation) not WHAT (goal).

#### Self-Contained Skills Mandate (B14)

**CRITICAL**: Skills MUST be self-contained. Do NOT use `depends-on` to reference other skills.

**Why**: Different agent platforms may not have access to the same skills. Each skill must work independently.

**Instead of depending on other skills**:
1. **Embed connection instructions** directly in the skill
2. **Copy necessary scripts** into the skill's scripts directory
3. **Document auth requirements** in the MCP Server Requirements section

**Example - Wrong**:
```yaml
depends-on: [mcp-server-oauth, connect-to-nango-mcp]
```
Then: "Follow the `mcp-server-oauth` skill workflow..."

**Example - Right**:
```yaml
# No depends-on field
```
Then: Include inline OAuth instructions or copy the OAuth scripts into your skill's scripts directory.

**Legacy `depends-on` Field**:
If you encounter an existing skill with `depends-on`, refactor it to be self-contained by:
1. Remove the `depends-on` field from frontmatter
2. Copy any scripts from the dependency into the skill's scripts directory
3. Embed connection/auth instructions inline in the workflow
4. Update all references to the dependency skill with inline guidance

#### Portable But Optional Scripts (B15)

**Scripts are portable tools, NOT requirements.**

When creating bundled scripts:
- ✅ Scripts should be zero-dependency and use only built-in runtime features (Node.js 18+ fetch)
- ✅ Scripts should be documented with usage, env vars, and output format
- ✅ Always note that scripts are OPTIONAL if the agent platform has its own mechanism

**Example pattern for Step 1 (Connection & Auth)**:
```markdown
**For platforms with their own MCP connection management**:
Use your platform's mechanism to connect to [URL] with [auth type].

**For platforms using the bundled scripts**:
1. Run `check-auth.cjs [provider]` to get authentication details
2. Connect to [URL] with required headers
3. Tools will be immediately available
```

**Rationale**: Some agent platforms (like Claude Code, Vercel AI SDK, etc.) may have built-in MCP connection managers with OAuth flows, token storage, etc. Don't force them to use scripts when their native mechanism is better.

### Phase 4: Create Bundled Scripts

Place scripts in the `scripts/` subdirectory.

**IMPORTANT**: If the `scripts/` directory doesn't exist yet, create it first before writing script files. The same applies to other supporting directories (`examples/`, `references/`, `assets/`). Skills may start minimal and grow over time as they're optimized.

#### Script Portability Rules (B7)

Scripts MUST follow these rules:

1. **Use `.cjs` extension** (not `.js`) to avoid ESM/CJS conflicts when symlinked
2. **NEVER pass secrets as CLI arguments** — use environment variables
3. **Accept all variable inputs as arguments or env vars** — never hardcode IDs or keys
4. **Filenames in SKILL.md must exactly match filenames on disk**

Example script structure:
```javascript
#!/usr/bin/env node
// scripts/my-script.cjs

// Get secrets from env vars
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error('ERROR: API_KEY environment variable required');
  process.exit(1);
}

// Get variable inputs from CLI args
const resourceId = process.argv[2];
if (!resourceId) {
  console.error('Usage: node my-script.cjs <resource-id>');
  process.exit(1);
}

// Output JSON to stdout
console.log(JSON.stringify({ status: 'success', data: {...} }));
```

Scripts should:
- Use only built-in runtime features (Node.js fetch, fs, path)
- Accept input via command-line arguments and environment variables
- Output JSON to stdout
- Use proper exit codes (0 = success, 1 = error)

#### Script Interface Validation (B16)

**CRITICAL**: After writing scripts, you MUST verify that script documentation matches actual script behavior.

**Test-Document-Test Pattern:**
1. **Write and test the script** in isolation with sample inputs
2. **Document the interface** based on what actually works
3. **Test the documented command** to verify it matches the script

**Common Interface Mismatches:**
- ❌ Documentation shows `CLIENT_ID=... node script.cjs` but script expects `--client-id=...`
- ❌ Documentation shows `script.cjs` but file is actually `script.js`
- ❌ Documentation shows positional args but script expects named flags
- ❌ Documentation shows one env var name but script checks for a different one

**Validation Steps:**
1. Read the first 50 lines of each script to identify its actual parameter interface
2. Check if parameters come from:
   - `process.argv` (CLI arguments)
   - `process.env` (environment variables)
   - Both (document both)
3. Note the exact parameter names, format, and whether they're required or optional
4. Run the documented command with test inputs to verify it works
5. Update documentation if there's a mismatch

**Example Validation:**
```bash
# Read script to find interface
head -50 scripts/my-script.cjs | grep -E "process.argv|process.env"

# Test documented command
CLIENT_ID=test node scripts/my-script.cjs arg1
# OR
node scripts/my-script.cjs --client-id=test arg1

# Verify output matches documented JSON shape
```

### Phase 5: Add Platform Adaptation Notes

If your skill has platform-specific considerations (like MCP configuration), add a section:

```markdown
## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session...

### Static MCP Configuration
For agents requiring config file + restart...
```

### Phase 6: Validate and Publish

**CRITICAL**: Before publishing, validate that the skill meets all portability requirements.

#### Frontmatter Validation (B1)

ALL required frontmatter fields must be present:
- `name` (required) - kebab-case skill identifier
- `description` (required) - brief, clear description
- `version` (required) - semver format (e.g., 1.0.0)
- `author` (required) - authoring entity
- `mcp-servers` (required) - array of server names, use `[]` if none
- `allowed-tools` (required) - array of tool names, use `[]` if none - **prevents Legacy Mode**
- `tags` (required) - at least one tag

**FAIL the publish if any required field is missing.** Do not create duplicate frontmatter blocks.

#### Reference MCP URL Requirement (B3)

If `mcp-servers` is non-empty, the skill MUST include:
- A working reference MCP server URL
- Transport type (HTTP, SSE, Streamable HTTP)
- Auth type (OAuth, API key, none)

Skills without reference URLs are non-portable. Test-connect to the reference URL before publishing.

#### MCP Server Documentation Pattern

Skills that depend on MCP servers must help **other agents** find and connect to the right server. Use this pattern:

```markdown
## MCP Server Requirements

This skill requires an MCP server that provides **[capability description]** (e.g., incident management, CRM integration).

**Required tools:** `toolA`, `toolB`, `toolC`

**Reference MCP Server:**
- Transport: HTTP (or SSE/Streamable HTTP)
- URL: `https://<server-name>.mcpgateway.online/mcp`
- Auth: OAuth (scopes: `scope1 scope2`) / API key (header: X-API-Key) / None

If you have your own MCP server that provides equivalent functionality, use that instead.
```

**Authentication Documentation (B8) - MANDATORY:**

**CRITICAL**: If the MCP server requires auth, you MUST clearly document the auth type to prevent wasted time trying different authentication methods.

Required documentation:
1. **Auth Type** (MUST be explicit): OAuth 2.0, header-based authentication, API key, Bearer token, none
   - Include this in the "Reference MCP Server" section: `- Auth Type: **[Type]**`
   - Example: `- Auth Type: **Header-based authentication**`
   - Example: `- Auth Type: **OAuth 2.0 with PKCE**`
   - Example: `- Auth Type: **None required**`

2. **For OAuth 2.0**:
   - Grant type (authorization_code, client_credentials, etc.)
   - Whether PKCE is required
   - Actual working scopes (not just examples)
   - Client type (confidential/public)
   - Token TTL and refresh token availability
   - OAuth discovery endpoint (if RFC 8414 compliant)

3. **For Header-Based Authentication**:
   - All required headers with exact names
   - Example values format (but never actual secrets)
   - How to obtain credentials (e.g., "Run check-auth.cjs" or "Get from provider dashboard")

4. **For API Key**:
   - Header name (e.g., `X-API-Key`, `Authorization: Bearer`)
   - How to obtain the key (dashboard URL, CLI command, etc.)
   - Key rotation policy if applicable

5. **If NOT OAuth** (when it might be expected based on the service type):
   - Explicitly state "This server does NOT use OAuth"
   - Explain what it uses instead

6. **Error scenarios**:
   - What happens on auth failure (401, 403, 400 responses)
   - How to recover (refresh token, re-authenticate, check credentials)
   - Common mistakes (e.g., using user ID instead of connection ID)

**Session-Based MCP Servers (B9):**
Some MCP servers require session initialization. If your server requires this, document:
- That `initialize` must be called before `tools/list` or `tools/call`
- The protocol version supported
- That a `mcp-session-id` header must be included on subsequent requests

**TMF Schema Compatibility Warning (B10):**
TMF-based MCP servers may expose tool schemas with `@`-prefixed property keys incompatible with some platforms. Skills for TMF servers must:
1. Note the `@type` issue in MCP Server Requirements
2. List which tools are safe vs unsafe to load natively
3. Provide curl-based fallback instructions for affected platforms
4. Note that the OpenAPI spec pre-processor can sanitize these automatically

**Dependency Inline Fallback (B6) - DEPRECATED:**

**⚠️ IMPORTANT**: The `depends-on` field is DEPRECATED. Skills should be self-contained (see B14).

**If you encounter legacy skills with `depends-on`**:
- Refactor them to be self-contained by embedding the dependency content
- Remove the `depends-on` field
- Copy necessary scripts into the skill's scripts directory
- Document connection/auth inline in the workflow

**Legacy guidance** (for understanding old skills only):
When a skill had `depends-on`, it was required to inline minimum viable fallback info (server URL, auth type, required headers, summary). This was a workaround for the real problem: skills should never depend on other skills in the first place.

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

## Minimum Viable Skill Structure (B4)

Every skill MUST have:
1. ✅ **Complete frontmatter** (all required fields: name, description, version, author, mcp-servers, allowed-tools, tags)
2. ✅ **MCP Server Requirements section** (with reference URL, or explain why N/A)
3. ✅ **Prerequisites section** (env vars, runtime, auth type)
4. ✅ **Workflow section** (phased, at least 2 phases)
5. ✅ **Error Handling / Troubleshooting section** (at least common failures)

Every skill SHOULD have:
6. **Platform Adaptation Notes** (if platform-specific considerations exist)
7. **Bundled Scripts documentation** (if scripts exist) - see B18 below
8. **Example output / response shapes** (for clarity)

## Script Quick-Reference Section (B18)

Skills that include bundled scripts MUST include a **"Script Quick Reference"** section near the top of the workflow (after Prerequisites, before the main workflow steps). This section enables agents to run scripts directly without reading the entire workflow.

**Why this matters**: Agents may be asked to "run script X" directly. Without a quick-reference, the agent must parse the entire workflow to find the script's interface, often getting confused and attempting MCP connections instead of simple script execution.

**Required format:**

```markdown
## Script Quick Reference

All scripts require Node.js 18+ and output JSON to stdout.

| Script | Purpose | Env Vars | Arguments | Example |
|--------|---------|----------|-----------|---------|
| `check-auth.cjs` | Verify provider connection | `NANGO_SECRET_KEY`, `NANGO_DEFAULT_USER_ID` | `<provider>` | `NANGO_SECRET_KEY=xxx NANGO_DEFAULT_USER_ID=user@test.com node scripts/check-auth.cjs hubspot` |
| `discover-cloud-id.cjs` | Find Jira Cloud ID | `NANGO_SECRET_KEY` | `<connectionId>` | `NANGO_SECRET_KEY=xxx node scripts/discover-cloud-id.cjs hubspot-abc123` |

**Chaining scripts**: Some scripts need output from others. For example, `list-issue-types.cjs` requires `cloudId` (from `discover-cloud-id.cjs`) and `connectionId` (from `check-auth.cjs`).
```

**Rules:**
- List ALL scripts in the table, not just the main ones
- Show the EXACT env var names (must match `process.env.*` in the script)
- Show the EXACT argument order (must match `process.argv[2]`, `[3]`, etc.)
- Include a runnable example for each script
- Document script chaining dependencies (which scripts need output from other scripts)
- This section is the **single source of truth** for script execution - agents should not need to read anything else to run a script

## Tool Availability Verification Pattern (B19)

Some agent frameworks separate skill instructions from MCP tool access. A skill may be loaded (agent can read SKILL.md) but the referenced MCP tools may not be in the agent's current tool context. Skills MUST handle this gracefully.

**The Problem:**
```
Agent loads skill → reads "call list_service_specifications" → tool not available → ERROR
```

**The Solution - Three-Tier Tool Resolution:**

Every skill workflow should begin with a Step 1 that follows this pattern:

```markdown
### Step 1: Verify Tool Availability

Before proceeding, check if the required tools are available in your current context:
- `tool_name_1`
- `tool_name_2`

**If tools ARE available**: Skip to Step 2 immediately.

**If tools are NOT available but you can connect to MCP servers**:
Connect to the reference MCP server at `<URL>` (see MCP Server Requirements above).
After connection, the tools will become available. Then proceed to Step 2.

**If you cannot connect to MCP servers from this context**:
This skill requires MCP tools that are not available in your current execution context.
The MCP server must be configured separately before this skill can be used.
Server URL: `<URL>`, Auth: `<auth-type>`. See Platform Adaptation Notes below.
```

**Why this matters**: Without this pattern, agents on frameworks that separate skill reading from tool execution will:
1. Load the skill successfully
2. Try to call tools that don't exist in their context
3. Fail with "unavailable tool" errors
4. Waste steps trying alternative approaches

**Three platform types to support:**

| Platform Type | Skill Context | Tool Context | Resolution |
|--------------|---------------|--------------|------------|
| Unified (e.g., your skill builder) | Skill + MCP tools together | Same context | Tools available immediately |
| Dynamic MCP (e.g., Claude Code) | Skill loaded separately | Can connect on-demand | Connect to MCP URL first |
| Separated (e.g., read-only frameworks) | Skill read-only | MCP configured separately | Require pre-configuration |

**Template for Step 1:**

```markdown
### Step 1: Verify Tool Availability

This skill requires the following tools: `tool_a`, `tool_b`.

**Tools already available?** → Proceed to Step 2.
**Tools not available?** → Connect to `<mcp-url>` (Auth: <type>). Then proceed.
**Cannot connect?** → Configure MCP server `<mcp-url>` in your agent settings first.
```

## Naming Convention (B13)

Name skills by what they DO (verb-noun / capability), not by what product they USE:
- ✅ `memory-management` not `open-memory-local-manager`
- ✅ `knowledge-management` (good as-is)
- ✅ `service-qualification-check` (good as-is)
- ✅ `incident-management` not `tmf724-incident-manager`
- ✅ `crm-task-manager` not `hubspot-task-manager`

## Recommended: Mandatory Response Format (B12)

Skills that produce user-facing results SHOULD include a "Mandatory Final Response" section specifying what the agent must report back.

Example pattern:
```markdown
## Mandatory Final Response

After [operation]:
✓ [Operation] completed successfully!
[Key field 1]: [value]
[Key field 2]: [value]
```

This ensures consistent, parseable output across different agents executing the skill.

## File Organization

**No Scaffold Noise (B11):**
Only create directories that contain files. Do not create empty:
- `assets/`
- `examples/`
- `references/`
- `scenarios/`
- `scripts/`

If a skill has no scripts, don't create an empty `scripts/` directory.

**Dynamic Directory Creation:**
Skills may evolve over time. If you're optimizing a skill and need to add scripts, examples, or references:
1. Check if the directory exists
2. If not, create it before writing files
3. Never assume directories were created during initial skill authoring

Example: A skill may start without scripts, but later optimization may require adding helper scripts. The skill builder agent must be able to create the `scripts/` directory at that time.

## Checklist Before Publishing

**Required Fields:**
- [ ] `name` - present and valid
- [ ] `description` - present and clear
- [ ] `version` - present and semver format
- [ ] `author` - present
- [ ] `mcp-servers` - specified (use `[]` if none needed)
- [ ] `allowed-tools` - specified (use `[]` if none needed, enables lazy loading)
- [ ] `tags` - at least one tag present

**Required Sections:**
- [ ] MCP Server Requirements (with reference URL if mcp-servers is non-empty)
- [ ] Prerequisites (env vars, runtime, auth)
- [ ] Workflow (at least 2 phases)
- [ ] Error Handling / Troubleshooting

**Quality Checks:**
- [ ] No platform-specific tool syntax in SKILL.md
- [ ] No hardcoded config file paths
- [ ] No vendor-prefixed tool names in workflow prose
- [ ] Scripts use `.cjs` extension
- [ ] Scripts use only standard runtime features
- [ ] Scripts accept secrets via env vars (not CLI args)
- [ ] MCP requirements documented declaratively with reference URL
- [ ] **Auth type explicitly documented** (OAuth 2.0, header-based, API key, none) in Reference MCP Server section
- [ ] **Skill is self-contained** - no `depends-on` field, all scripts and instructions embedded
- [ ] **Scripts noted as optional** - workflow provides alternative for platforms with built-in auth
- [ ] Natural language workflow descriptions
- [ ] Platform Adaptation Notes included (if applicable)
- [ ] **User-blocking actions have explicit STOP AND WAIT instructions**
- [ ] No "obtain from dashboard" or GUI-dependent instructions
- [ ] No empty scaffold directories
- [ ] Tested on at least one agent platform

**Validation Checks (MUST PASS before publishing):**
- [ ] **Reference URL connectivity** - if mcp-servers is non-empty, test-connect to the reference URL
- [ ] **Script interface verification** - documented command syntax matches actual script behavior (read script source to verify)
- [ ] **Script filename matches** - all script references in SKILL.md exactly match filenames on disk (including extension)
- [ ] **End-to-end workflow test** - execute the complete workflow following the SKILL.md instructions
- [ ] **Auth flow test** - if auth required, complete the auth flow and verify tools become available
- [ ] **Error scenario test** - trigger at least one error condition and verify troubleshooting guidance works
- [ ] **Programmatic discovery** - all inputs are discoverable via scripts or tool calls (no "obtain from dashboard")
- [ ] **Output format validation** - scripts output matches documented JSON shapes

---

## Common Publishing Failures (Learn from Real Testing)

These issues were discovered during systematic skill testing and should be caught before publishing:

### Script-Documentation Mismatches
**Symptom**: User follows documented command but script errors with "unexpected flag" or "missing required parameter"
**Root Cause**: Script interface changed but documentation wasn't updated
**Prevention**: Run B16 Script Interface Validation before publishing

### Dead Reference URLs
**Symptom**: Skill claims portability but reference URL returns 404 or connection refused
**Root Cause**: URL wasn't tested before publishing
**Prevention**: Test-connect to reference URL and verify tools become available

### Filename Case Mismatches
**Symptom**: SKILL.md says `check-auth.cjs` but file is `check-auth.js`
**Root Cause**: Scripts were renamed but SKILL.md wasn't updated
**Prevention**: Use exact filenames in documentation, verify with `ls` before publishing

### Wrong Tool Parameter Names
**Symptom**: Workflow says "pass providerName" but tool expects "provider_name"
**Root Cause**: Documentation guessed parameter names instead of checking inputSchema
**Prevention**: Always read tool inputSchema before documenting parameter usage

### URL Path Bugs in Scripts
**Symptom**: Script works locally but fails in production with 404
**Root Cause**: Script has hardcoded wrong path (e.g., `/proxy/ex/jira/oauth/...` instead of `/proxy/oauth/...`)
**Prevention**: Test scripts against actual servers before bundling

### GUI-Dependent Instructions
**Symptom**: Workflow says "obtain cloudId from Jira dashboard"
**Root Cause**: Author didn't provide programmatic discovery method
**Prevention**: Every required input must be obtainable via script or tool call

### Auth Type Ambiguity
**Symptom**: Agents try OAuth when server uses API keys, or vice versa
**Root Cause**: MCP Server Requirements doesn't clearly state auth type upfront
**Prevention**: Auth Type must be in first 5 lines of MCP Server Requirements, bold and explicit

---

## Skill Maintenance & Evolution (B17)

Skills are **living documents** that must evolve as servers change. Skill authors should handle two maintenance scenarios:

### Scenario 1: Server Requirements Change

**Symptom**: Previously working skill now fails with auth errors, tool not found, or invalid parameters

**Detection**:
1. Load the existing skill to see what it claims
2. Re-connect to the reference MCP server to see current requirements
3. Compare skill documentation vs actual server state

**Update Process**:
1. Ask user for permission to update the skill
2. Update affected sections (MCP Server Requirements, Prerequisites, Workflow, Troubleshooting)
3. Bump version number according to semver:
   - **Patch** (1.0.0 → 1.0.1): Docs fixes, typos, clarifications
   - **Minor** (1.0.0 → 1.1.0): New auth requirements, new optional params, added troubleshooting
   - **Major** (1.0.0 → 2.0.0): Breaking changes (tool renamed, required params changed, workflow differs)
4. Re-validate the updated skill (run Phase 6 validation again)
5. Publish with updated version

**Common Server Changes**:
- Auth added/changed: None → API Key, API Key → OAuth
- Tool renamed: `get_data` → `fetch_data`
- Parameter schema changed: `resourceId` → `resource_id`
- New required scopes: `read` → `read write`
- URL changed: Server moved to new domain

### Scenario 2: Bug Discovered in Existing Skill

**Symptom**: User reports skill doesn't work or has incorrect instructions

**Detection**:
1. Load the skill and attempt to follow it step-by-step
2. Identify where it breaks or produces wrong results
3. Determine if it's a skill bug or environment issue

**Update Process**:
1. Fix the bug (script, documentation, or both)
2. Bump version (patch for bug fixes)
3. Add the failure scenario to Troubleshooting section
4. Re-validate the skill
5. Publish updated version

### Version History Best Practice

Add a version history section to skills with multiple versions:

```markdown
## Version History

### v1.1.0 (2026-02-12)
- **Breaking**: Server now requires API key authentication (previously no auth)
- Updated MCP Server Requirements section with auth instructions
- Added `check-auth.cjs` script for credential verification

### v1.0.1 (2026-02-10)
- Fixed script filename: `discover-id.js` → `discover-id.cjs`
- Fixed URL in discover script: removed `/ex/provider` from path

### v1.0.0 (2026-02-01)
- Initial release
```

### Deprecation Path

If a server is permanently retired or a skill becomes obsolete:
1. Update skill frontmatter: `deprecated: true`
2. Add deprecation notice at top of SKILL.md
3. Point to replacement skill if available
4. Keep the skill published (don't delete) so users understand why it stopped working

---

## Resources

- [SKILL_AUTHORING.md](./references/SKILL_AUTHORING.md) - Full authoring guidelines
- [ARCHITECTURE.md](./references/ARCHITECTURE.md) - System architecture overview
- [mcp-server-oauth skill](../mcp-server-oauth/SKILL.md) - OAuth handling for protected MCP servers
