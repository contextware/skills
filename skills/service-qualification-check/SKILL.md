---
name: service-qualification-check
description: Check if specific services (fiber, cable, etc.) are available at a given address using the Telepath MCP server.
version: 1.1.0
author: agent-skills-workbench
mcp-servers: [telepath]
allowed-tools: [service_qualification, list_service_specifications]
tags: [telepath, service-qualification, telecom, portable]
---

# Service Qualification Check

This skill checks if specific telecommunication services (fiber, cable, DSL, etc.) are available at a given address using the Telepath MCP server.

## Prerequisites

- Access to a Telepath MCP server instance
- No authentication required (public API for demonstration purposes)

## MCP Server Requirements

This skill requires the **Telepath MCP Server** for service qualification checks.

**Required Tools:**
- `service_qualification`: Check if a service is available at an address
- `list_service_specifications`: List available service types

**Reference MCP Server:**
- Transport: HTTP (session-based)
- URL: `https://akuig.bss.ngrok.dev/mcp`
- Auth: None required (public demonstration server)

If you have your own Telepath MCP server that provides equivalent functionality, use that instead.

**Session-Based MCP Server**:
This is a session-based MCP server that maintains connection state. The server handles multiple concurrent sessions and does not require authentication for the public demo endpoint.

---

## Workflow

**GOAL**: Determine if a specific service is available at an address. Connection verification is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `list_service_specifications`, `service_qualification`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the Telepath MCP server:
- URL: `https://akuig.bss.ngrok.dev/mcp`
- Auth: None required
- Transport: HTTP (session-based)
Once connected, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Telepath MCP server to your agent's MCP configuration:
- Server URL: `https://akuig.bss.ngrok.dev/mcp`
- No authentication headers needed
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: List Available Service Types (Optional)

If you're unsure what service types are available, use the `list_service_specifications` tool.

**Parameters**: None required

**Expected Response**:
```json
[
  {
    "id": "fiber-1000",
    "name": "Fiber 1000 Mbps",
    "type": "fiber",
    "description": "Residential fiber optic service with 1000 Mbps download"
  },
  {
    "id": "cable-500",
    "name": "Cable 500 Mbps",
    "type": "cable",
    "description": "Residential cable internet with 500 Mbps download"
  }
]
```

### Step 3: Check Service Availability

Use the `service_qualification` tool to check if a service is available at an address.

**Required Parameters**:
- **address** (object): Address components
  - **streetNumber** (string): Street number
  - **streetName** (string): Street name
  - **city** (string): City name
  - **state** (string, optional): State/province
  - **postalCode** (string, optional): ZIP/postal code
  - **country** (string, optional): Country
- **serviceSpecificationId** (string): Service specification ID from Step 2

**Example**:
```json
{
  "address": {
    "streetNumber": "123",
    "streetName": "Main Street",
    "city": "Anytown",
    "state": "CA",
    "postalCode": "94101"
  },
  "serviceSpecificationId": "fiber-1000"
}
```

**Expected Response**:
```json
{
  "qualificationResult": "available",
  "address": {
    "streetNumber": "123",
    "streetName": "Main Street",
    "city": "Anytown",
    "state": "CA",
    "postalCode": "94101"
  },
  "serviceSpecification": {
    "id": "fiber-1000",
    "name": "Fiber 1000 Mbps"
  },
  "installationDate": "2026-03-15",
  "additionalInfo": "Service available with standard installation"
}
```

**Possible `qualificationResult` values**:
- `available`: Service is available at the address
- `not_available`: Service is not available at the address
- `pending`: Service availability requires further investigation
- `conditional`: Service may be available under certain conditions

---

## Platform Adaptation Notes

### Unified Platforms (skill + MCP tools in same context)
For agents where loading a skill automatically makes referenced MCP tools available:
1. Tools are already available after skill load
2. Proceed directly to the workflow steps
3. No connection step needed

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Connect to `https://akuig.bss.ngrok.dev/mcp` (no auth needed)
2. The connection persists for the session duration
3. Tools are immediately available after connection
4. Treat connection and service check as a single workflow

### Separated Platforms (skill context separate from tool context)
For agents where skill instructions and MCP tools are in separate contexts:
1. The MCP server must be configured and connected BEFORE loading this skill
2. Verify MCP tools are available in your tool context first
3. Then load the skill for workflow instructions
4. If tools and skills cannot coexist, configure the MCP server in your agent's settings and use the skill instructions as a reference

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the Telepath MCP server to your agent's configuration
2. No authentication required for demo server
3. Restart the agent to apply the configuration
4. Tools will be immediately available

### Session-Based Server
The Telepath server is session-based, meaning:
- Each connection creates a unique session
- Session state is maintained during the connection
- Multiple concurrent sessions are supported
- No session IDs or tokens need to be managed by the client

### Continuous Workflow Pattern
Agents should treat connection and service qualification as a single operation. Only report the final result (e.g., "Fiber is available at 123 Main St") to the user. Do not pause to say "I am now connected."

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the Telepath MCP server is connected
- **Connection Failed**: Verify `https://akuig.bss.ngrok.dev/mcp` is accessible
  - Check network connectivity
  - Verify no firewall is blocking the connection
  - Try accessing the URL in a browser
- **Invalid Address**: Ensure all required address fields are provided
  - At minimum: streetNumber, streetName, city
  - Some services may require state and postalCode
- **Service Specification Not Found**: The serviceSpecificationId doesn't exist
  - Use `list_service_specifications` to see available services
  - Verify you're using the correct ID (not the name or type)
- **Qualification Result "pending"**: The service availability requires manual verification
  - This typically means the address is in a borderline area
  - Contact the service provider for manual qualification
- **Qualification Result "conditional"**: Service may be available under conditions
  - Check `additionalInfo` field for details
  - May require additional fees, equipment, or infrastructure work
- **Empty Service List**: The server may be experiencing issues
  - Verify server is running and accessible
  - Contact server administrator

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY service qualification check, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After checking service availability (result: "available"):
```
✓ Service is available!

Service: [service name]
Address: [formatted address]
Installation Date: [date if available]
Additional Info: [info if available]
```

After checking service availability (result: "not_available"):
```
✗ Service is not available at this address.

Service: [service name]
Address: [formatted address]

Would you like me to check for alternative services?
```

After checking service availability (result: "pending" or "conditional"):
```
⚠ Service availability requires further investigation

Service: [service name]
Address: [formatted address]
Status: [pending/conditional]
Details: [additional info]

I recommend contacting the service provider directly for a detailed qualification.
```

After listing available services:
```
✓ Available service types:

1. [Service Name] ([Type])
   [Description]

2. [Service Name] ([Type])
   [Description]
...
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Fiber 1000 is available at 123 Main St"`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.

---

## Example Usage

### Example 1: Checking Fiber Availability

**User**: "Can you check if fiber is available at 123 Main Street, Anytown?"

**Agent workflow**:
1. Ensures Telepath MCP is connected
2. Calls `list_service_specifications` to find fiber service IDs
3. Calls `service_qualification` with address and fiber service ID
4. Receives qualification result
5. Presents formatted result to user

**Agent response**:
```
✓ Service is available!

Service: Fiber 1000 Mbps
Address: 123 Main Street, Anytown, CA 94101
Installation Date: March 15, 2026
Additional Info: Service available with standard installation
```

### Example 2: Service Not Available

**User**: "Is gigabit cable available at 456 Oak Avenue, Springfield?"

**Agent response**:
```
✗ Service is not available at this address.

Service: Cable Gigabit
Address: 456 Oak Avenue, Springfield, IL

Would you like me to check for alternative services like DSL or fixed wireless?
```

### Example 3: Listing Services First

**User**: "What internet services do you have information about?"

**Agent response**:
```
✓ Available service types:

1. Fiber 1000 Mbps (fiber)
   Residential fiber optic service with 1000 Mbps download

2. Cable 500 Mbps (cable)
   Residential cable internet with 500 Mbps download

3. DSL 100 Mbps (dsl)
   ADSL service with up to 100 Mbps download

4. Fixed Wireless 300 Mbps (fixed-wireless)
   Wireless internet service with 300 Mbps download
```
