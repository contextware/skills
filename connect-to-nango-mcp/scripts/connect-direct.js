/**
 * Nango MCP Direct Connection Script
 *
 * This is a reference script showing how to programmatically connect to the
 * Nango MCP server in a one-off manner. This is useful for agents that can
 * create MCP client connections directly but don't have built-in support for
 * adding MCP servers on the fly via configuration.
 *
 * REQUIREMENTS:
 *   - @modelcontextprotocol/sdk package installed
 *   - Node.js 18+
 *
 * Required Environment Variables:
 *   - NANGO_SECRET_KEY or NANGO_SECRET_KEY_DEV: Your Nango secret key
 *   - CONNECTION_ID: The connection ID from OAuth (get via check-auth.js)
 *   - INTEGRATION_ID or PROVIDER_CONFIG_KEY: The provider name (e.g., 'hubspot', 'salesforce')
 *
 * Usage:
 *   node connect-direct.js
 *
 * This script demonstrates the connection pattern. Agents should adapt this
 * to their runtime environment.
 */

import { createMCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

// Get configuration from environment variables
const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY || process.env.NANGO_SECRET_KEY_DEV;
const CONNECTION_ID = process.env.CONNECTION_ID;
const PROVIDER_CONFIG_KEY = process.env.INTEGRATION_ID || process.env.PROVIDER_CONFIG_KEY;
const NANGO_MCP_URL = process.env.NANGO_MCP_URL || 'https://api.nango.dev/mcp';

// Validate required environment variables
if (!NANGO_SECRET_KEY) {
  console.error(JSON.stringify({
    status: 'error',
    message: 'NANGO_SECRET_KEY or NANGO_SECRET_KEY_DEV environment variable is required'
  }));
  process.exit(1);
}

if (!CONNECTION_ID) {
  console.error(JSON.stringify({
    status: 'error',
    message: 'CONNECTION_ID environment variable is required. Run check-auth.js first to obtain it.'
  }));
  process.exit(1);
}

if (!PROVIDER_CONFIG_KEY) {
  console.error(JSON.stringify({
    status: 'error',
    message: 'INTEGRATION_ID or PROVIDER_CONFIG_KEY environment variable is required'
  }));
  process.exit(1);
}

async function connectToNangoMCP() {
  try {
    // Create MCP client with Nango HTTP transport
    const mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(new URL(NANGO_MCP_URL), {
        requestInit: {
          headers: {
            'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
            'connection-id': CONNECTION_ID,
            'provider-config-key': PROVIDER_CONFIG_KEY,
          },
        },
      })
    });

    console.log(JSON.stringify({
      status: 'success',
      message: 'Successfully connected to Nango MCP server',
      provider: PROVIDER_CONFIG_KEY,
      connectionId: CONNECTION_ID
    }));

    // List available tools
    const tools = await mcpClient.listTools();
    console.log(JSON.stringify({
      status: 'tools_available',
      tools: tools.tools.map(t => ({
        name: t.name,
        description: t.description
      }))
    }));

    return mcpClient;
  } catch (error) {
    console.error(JSON.stringify({
      status: 'error',
      message: `Failed to connect to Nango MCP: ${error.message}`,
      error: error.toString()
    }));
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  connectToNangoMCP()
    .then(client => {
      console.log(JSON.stringify({
        status: 'ready',
        message: 'MCP client ready for tool calls'
      }));
      // Keep the client alive for subsequent tool calls
      // In production, you would store this client and use it for operations
    })
    .catch(error => {
      console.error(JSON.stringify({
        status: 'error',
        message: error.message
      }));
      process.exit(1);
    });
}

export { connectToNangoMCP };
