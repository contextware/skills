---
name: nlweb-company-data-query
description: >-
  This skill allows you to ask questions about company data using natural
  language. Use it to find information about employees, projects, or other
  internal knowledge.
metadata:
  createdAt: '2026-01-29T16:07:04.398Z'
allowed-tools:
  - nlweb-mcp_ask
mcp-servers:
  - nlweb-mcp
---
# NLWeb Company Data Query Skill

This skill enables you to query company data using the NLWeb MCP server.

## MCP Server Requirements

This skill depends on the `nlweb-mcp` server being connected. If the server is not already connected, the agent should attempt to connect to it. The `nlweb-mcp` server uses OAuth, so the agent will need to guide the user through the authentication process if not already authenticated.

**Tool Dependency**:
- `nlweb-mcp_ask`

---

## Workflow

1.  The agent uses the `nlweb-mcp_ask` tool to query the company data with the user's question. The `query` parameter should be set to the user's question.
2.  The agent presents the results to the user.

## Example

User: Who is the CEO of the company?

Agent: (Uses this skill with query="Who is the CEO of the company?")

Agent: The CEO of the company is John Smith.

