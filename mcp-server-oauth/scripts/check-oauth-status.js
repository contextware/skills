#!/usr/bin/env node

/**
 * check-oauth-status.js
 * 
 * Checks if an MCP server requires OAuth authentication and retrieves
 * the authorization URL if available.
 * 
 * Usage: node check-oauth-status.js <mcp-server-url> [options]
 * 
 * Arguments:
 *   mcp-server-url  The URL of the MCP server to check
 * 
 * Options:
 *   --method=GET|OPTIONS  HTTP method to use for probing (default: OPTIONS)
 * 
 * Environment Variables:
 *   MCP_AUTH_HEADER      Optional auth header to include
 * 
 * Output: JSON to stdout
 *   { "status": "available|requires_auth|error", "authUrl": "...", "message": "..." }
 */

const url = process.argv[2];
const methodArg = process.argv.find(arg => arg.startsWith('--method='));
const method = methodArg ? methodArg.split('=')[1] : 'OPTIONS';

if (!url) {
    console.log(JSON.stringify({
        status: 'error',
        message: 'Usage: node check-oauth-status.js <mcp-server-url>'
    }));
    process.exit(1);
}

async function checkOAuthStatus() {
    try {
        // Build headers
        const headers = {
            'Accept': 'application/json, text/event-stream',
            'Content-Type': 'application/json'
        };

        // Add optional auth header if provided
        const authHeader = process.env.MCP_AUTH_HEADER;
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // First, try a simple request to see if the server is accessible
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
            response = await fetch(url, {
                method: method,
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);

            // Handle abort/timeout
            if (fetchError.name === 'AbortError') {
                console.log(JSON.stringify({
                    status: 'error',
                    message: 'Connection timeout - server may be unavailable'
                }));
                process.exit(1);
            }

            throw fetchError;
        }

        // Check response status
        if (response.ok) {
            // Server is accessible without auth
            console.log(JSON.stringify({
                status: 'available',
                message: 'MCP server is accessible'
            }));
            return;
        }

        // Handle auth-related status codes
        if (response.status === 401 || response.status === 403) {
            // Try to extract auth URL from response
            const contentType = response.headers.get('content-type') || '';
            let authUrl = null;
            let authType = 'oauth';

            // Check WWW-Authenticate header for OAuth info
            const wwwAuth = response.headers.get('www-authenticate');
            if (wwwAuth) {
                // Parse OAuth realm or authorization_uri
                const realmMatch = wwwAuth.match(/realm="([^"]+)"/);
                const authUriMatch = wwwAuth.match(/authorization_uri="([^"]+)"/);
                authUrl = authUriMatch?.[1] || realmMatch?.[1];

                if (wwwAuth.toLowerCase().includes('bearer')) {
                    authType = 'oauth2-bearer';
                }
            }

            // Check Link header for OAuth discovery
            const linkHeader = response.headers.get('link');
            if (linkHeader && !authUrl) {
                const oauthLink = linkHeader.match(/<([^>]+)>;\s*rel="oauth2-authorize"/);
                if (oauthLink) {
                    authUrl = oauthLink[1];
                }
            }

            // Try to parse JSON response for auth info
            if (contentType.includes('json') && !authUrl) {
                try {
                    const body = await response.json();
                    authUrl = body.authUrl || body.auth_url || body.authorization_url ||
                        body.oauth?.authorize_url || body.oauth?.authUrl;
                    authType = body.authType || body.auth_type || authType;
                } catch {
                    // Ignore JSON parsing errors
                }
            }

            // Build response
            const result = {
                status: 'requires_auth',
                authType: authType,
                httpStatus: response.status,
                message: response.status === 401
                    ? 'Authentication required'
                    : 'Access forbidden - authorization required'
            };

            if (authUrl) {
                result.authUrl = authUrl;
            } else {
                result.message += '. No OAuth discovery URL found in response headers or body.';
                result.hint = 'The server requires authentication but did not provide an OAuth authorization URL. Check the server documentation for authentication instructions.';
            }

            console.log(JSON.stringify(result));
            return;
        }

        // Handle other error responses
        console.log(JSON.stringify({
            status: 'error',
            httpStatus: response.status,
            message: `Server returned ${response.status}: ${response.statusText}`
        }));

    } catch (error) {
        console.log(JSON.stringify({
            status: 'error',
            message: error.message || String(error)
        }));
        process.exit(1);
    }
}

checkOAuthStatus();
