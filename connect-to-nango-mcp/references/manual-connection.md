# Manual Nango MCP Connection Reference

This document provides reference implementations for connecting to the Nango MCP server using custom headers.

## Required Headers

Every request must include these 3 headers:

| Header | Value | Source |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <secret-key>` | `NANGO_SECRET_KEY` |
| `connection-id` | `<connection-id>` | Result from `check-auth.js` |
| `provider-config-key` | `<provider>` | e.g., "hubspot" |

## Curl Implementation

Use this for testing connectivity and listing available tools:

```bash
curl -X POST https://api.nango.dev/mcp \
  -H "Authorization: Bearer <secret-key>" \
  -H "connection-id: <connection-id>" \
  -H "provider-config-key: <provider>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

