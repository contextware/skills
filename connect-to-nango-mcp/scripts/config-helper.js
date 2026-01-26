import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Portable credential storage location
const CREDENTIALS_DIR = path.join(os.homedir(), '.nango-mcp');
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, 'credentials.json');

/**
 * Read stored credentials from disk
 */
function readCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }

  try {
    const data = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(JSON.stringify({
      status: 'error',
      message: `Failed to read credentials: ${error.message}`
    }));
    process.exit(1);
  }
}

/**
 * Write credentials to disk
 */
function writeCredentials(data) {
  // Validate required fields
  const required = ['secret_key', 'connection_id', 'provider_config_key'];
  for (const field of required) {
    if (!data[field]) {
      console.error(JSON.stringify({
        status: 'error',
        message: `Missing required field: ${field}`
      }));
      process.exit(1);
    }
  }

  // Ensure directory exists
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }

  // Add metadata
  const credentialsWithMeta = {
    ...data,
    updated_at: new Date().toISOString()
  };

  try {
    fs.writeFileSync(
      CREDENTIALS_PATH,
      JSON.stringify(credentialsWithMeta, null, 2),
      'utf8'
    );

    console.log(JSON.stringify({
      status: 'success',
      message: 'Credentials saved successfully',
      path: CREDENTIALS_PATH
    }));
  } catch (error) {
    console.error(JSON.stringify({
      status: 'error',
      message: `Failed to write credentials: ${error.message}`
    }));
    process.exit(1);
  }
}

/**
 * Generate MCP server configuration from stored credentials
 */
function generateConfig() {
  const creds = readCredentials();

  if (!creds) {
    console.error(JSON.stringify({
      status: 'error',
      message: 'No credentials found. Please run authentication first.'
    }));
    process.exit(1);
  }

  const config = {
    mcpServers: {
      nango: {
        type: "http",
        url: "https://api.nango.dev/mcp",
        headers: {
          "Authorization": `Bearer ${creds.secret_key}`,
          "connection-id": creds.connection_id,
          "provider-config-key": creds.provider_config_key
        }
      }
    }
  };

  console.log(JSON.stringify(config, null, 2));
}

/**
 * Detect which coding agent is being used based on environment
 * Returns minimal info - the agent itself knows its config path best
 */
function detectAgent() {
  // Check for Claude Code
  if (process.env.CLAUDE_CODE) {
    return {
      name: 'Claude Code',
      hint: 'typically ~/.claude/settings.json'
    };
  }

  // Check for Cline (formerly Claude Dev)
  if (process.env.CLINE_USER_HOME_DIR) {
    return {
      name: 'Cline',
      hint: 'check your Cline MCP settings in VS Code'
    };
  }

  // Check for Roo Code
  if (process.env.ROO_CODE) {
    return {
      name: 'Roo Code',
      hint: 'check your Roo Code MCP settings'
    };
  }

  // Default/unknown
  return {
    name: 'coding agent',
    hint: 'check your agent\'s MCP configuration documentation'
  };
}

/**
 * Generate user-friendly instructions with config snippet
 */
function generateInstructions() {
  const creds = readCredentials();

  if (!creds) {
    console.error(JSON.stringify({
      status: 'error',
      message: 'No credentials found. Please run authentication first.'
    }));
    process.exit(1);
  }

  const agent = detectAgent();
  const config = {
    nango: {
      type: "http",
      url: "https://api.nango.dev/mcp",
      headers: {
        "Authorization": `Bearer ${creds.secret_key}`,
        "connection-id": creds.connection_id,
        "provider-config-key": creds.provider_config_key
      }
    }
  };

  console.log(`
✅ Nango authentication successful for ${creds.provider_config_key}!

To complete the connection:

1. Update your ${agent.name} MCP configuration (${agent.hint})

   Add this to the "mcpServers" section:

${JSON.stringify(config, null, 2)}

2. Restart your coding agent session

Credentials saved to: ${CREDENTIALS_PATH}
Last updated: ${creds.updated_at}
`);
}

/**
 * Main CLI handler
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'save':
      // Save credentials from JSON argument
      if (!process.argv[3]) {
        console.error(JSON.stringify({
          status: 'error',
          message: 'Missing credentials JSON argument'
        }));
        process.exit(1);
      }

      try {
        const data = JSON.parse(process.argv[3]);
        writeCredentials(data);
      } catch (error) {
        console.error(JSON.stringify({
          status: 'error',
          message: `Invalid JSON: ${error.message}`
        }));
        process.exit(1);
      }
      break;

    case 'generate':
      // Generate MCP config from stored credentials
      generateConfig();
      break;

    case 'read':
      // Read stored credentials
      const creds = readCredentials();
      if (!creds) {
        console.error(JSON.stringify({
          status: 'error',
          message: 'No credentials found'
        }));
        process.exit(1);
      }
      console.log(JSON.stringify(creds, null, 2));
      break;

    case 'instructions':
      // Generate user-friendly setup instructions
      generateInstructions();
      break;

    case 'help':
    default:
      console.log(`
Nango MCP Config Helper

Usage:
  node config-helper.js save '<json>'     Save credentials
  node config-helper.js generate          Generate MCP config
  node config-helper.js read              Read stored credentials
  node config-helper.js instructions      Generate setup instructions
  node config-helper.js help              Show this help

Examples:
  # Save credentials
  node config-helper.js save '{"secret_key":"sk_...","connection_id":"abc123","provider_config_key":"hubspot"}'

  # Generate config for agent settings
  node config-helper.js generate

  # Read current credentials
  node config-helper.js read

  # Get full setup instructions
  node config-helper.js instructions

Storage Location: ${CREDENTIALS_PATH}
`);
      break;
  }
}

// Run the CLI
main();
