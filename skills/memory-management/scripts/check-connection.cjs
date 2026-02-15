#!/usr/bin/env node

/**
 * check-connection.cjs
 * 
 * Verifies connectivity to the OpenMemory Local MCP server.
 * Handles the specific header requirements (SSE/JSON) and API key validation.
 * 
 * Usage: node check-connection.cjs <mcp-url> --api-key=<key>
 */

const http = require('http');
const https = require('https');

const mcpUrl = process.argv[2];
const args = process.argv.slice(3);

function getArg(name) {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : null;
}

const apiKey = getArg('api-key');

if (!mcpUrl) {
    console.log(JSON.stringify({
        status: 'error',
        message: 'MCP URL is required. Usage: node check-connection.cjs <mcp-url> [--api-key=<key>]'
    }));
    process.exit(1);
}

const url = new URL(mcpUrl);
const protocol = url.protocol === 'https:' ? https : http;

const options = {
    method: 'POST',
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
    }
};

if (apiKey) {
    options.headers['x-api-key'] = apiKey;
}

const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'connection-check', version: '1.0.0' }
    }
});

const req = protocol.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
        if (body.includes('"result":') || body.includes('"error":')) {
            try {
                const jsonStr = body.includes('data: ') ? body.match(/data: (\{.*\})/)[1] : body;
                const result = JSON.parse(jsonStr);

                if (result.error) {
                    console.log(JSON.stringify({
                        status: 'error',
                        error: result.error,
                        message: result.error.message || 'Unknown server error'
                    }));
                } else {
                    console.log(JSON.stringify({
                        status: 'success',
                        serverInfo: result.result.serverInfo,
                        message: 'Connected successfully'
                    }));
                }
                process.exit(0);
            } catch (e) {
                // Keep waiting
            }
        }
    });

    res.on('end', () => {
        if (!body) {
            console.log(JSON.stringify({ status: 'error', message: 'No response from server' }));
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.log(JSON.stringify({ status: 'error', message: e.message }));
    process.exit(1);
});

req.write(data);
req.end();

setTimeout(() => {
    console.log(JSON.stringify({ status: 'error', message: 'Connection timed out' }));
    process.exit(1);
}, 5000);
