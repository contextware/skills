# Contextware Skills

A collection of AI agent skills focused on **secure context management, MCP server integration, and controlled access to private and public data**.

These skills are designed for developers and platform teams building AI systems that need to:

* Integrate with **MCP servers and external APIs**
* Manage **private, public, and shared context**
* Enforce **security boundaries, access control, and auditing**
* Build reliable, production-grade agent workflows

The goal is to give AI coding agents (Claude Code and similar tools) **clear, opinionated workflows** for working safely with sensitive context in real systems.

Built and maintained by Contextware.

---

## What are Skills?

Skills are markdown files that give AI agents **specialized knowledge, patterns, and workflows** for a specific class of tasks.

When installed into your project, your AI coding agent can:

* Recognize when you’re working with MCP servers, context boundaries, or sensitive data
* Apply best practices for **authentication, authorization, auditing, and isolation**
* Follow consistent patterns for **API integration, context ingestion, and context serving**

Each skill is scoped to *when it should be used* and *how the agent should think and act* in that situation.

---

## What’s in this Repository?

This repository contains **one folder per skill**, with each skill focused on a distinct capability or workflow in the context-management space.

Rather than listing every skill here (they change frequently), skills generally fall into categories like:

* **MCP & Agent Integration**

  * Connecting agents to MCP servers
  * Defining tool boundaries and capabilities
  * Safe execution and error handling

* **Context Access & Isolation**

  * Handling private vs public context
  * Tenant and user isolation
  * Least-privilege access patterns

* **Security & Compliance**

  * Authentication and authorization flows
  * Auditing and traceability
  * Secure secrets and credential handling

* **API & Data Integration**

  * Calling internal and external APIs safely
  * Normalizing and validating context
  * Managing rate limits and failure modes

* **Operational Patterns**

  * Observability and logging
  * Guardrails and policy enforcement
  * Production hardening for agent systems

Browse the folders to see what’s available — each skill documents **when to use it** and **how it guides agent behavior**.

---

## Installation

### Option 1: CLI Install (Recommended)

Use the skills CLI to install directly:

```bash
# Install all skills
npx skills add contextware/skills

# Install specific skills
npx skills add contextware/skills --skill <skill-name>

# List available skills
npx skills add contextware/skills --list
```

This installs skills into your `.claude/skills/` directory.

---

### Option 2: Claude Code Plugin

Install via Claude Code’s plugin system:

```bash
# Add the marketplace
/plugin marketplace add contextware/skills

# Install all skills
/plugin install contextware-skills
```

---

### Option 3: Clone and Copy

Clone the repository and copy the skills manually:

```bash
git clone https://github.com/contextware/skills.git
cp -r skills/* .claude/skills/
```

---

### Option 4: Git Submodule

Add as a submodule for easier updates:

```bash
git submodule add https://github.com/contextware/skills.git .claude/contextware-skills
```

Then reference skills from `.claude/contextware-skills/`.

---

### Option 5: Fork and Customize

If you need org-specific policies or conventions:

1. Fork this repository
2. Customize or extend skills
3. Use your fork across projects

This is encouraged for regulated or security-sensitive environments.

---

## Usage

Once installed, just work normally and describe what you’re building.

Examples:

> “Integrate this agent with an MCP server that exposes customer context, but ensure strict tenant isolation.”

→ Uses MCP integration and context-isolation skills

> “Audit this API call path for improper access to private context.”

→ Uses security and auditing skills

> “Design a safe way for this agent to read public docs but never touch private user data.”

→ Uses context access and policy enforcement skills

You can also invoke skills directly (if supported by your agent):

```text
/<skill-name>
```

---

## Design Principles

These skills are built around a few core principles:

* **Security first** – assume context is sensitive unless proven otherwise
* **Explicit boundaries** – clear separation between private, shared, and public data
* **Auditable behavior** – actions should be traceable and explainable
* **Production realism** – patterns that hold up outside demos

They are intentionally opinionated.

---

## Contributing

Contributions are welcome.

If you:

* Improve an existing skill
* Add a new skill
* Fix unclear guidance or edge cases

Open a PR or issue. Please keep skills focused, explicit about when they apply, and grounded in real-world constraints.

See `CONTRIBUTING.md` for guidelines.

---

## License

MIT ./LICENSE


