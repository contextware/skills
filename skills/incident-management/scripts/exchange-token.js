#!/usr/bin/env node

/**
 * exchange-token.js
 *
 * Exchanges an OAuth 2.0 authorization code for an access token.
 * Supports both public clients (PKCE only) and confidential clients (with client_secret).
 *
 * This script is PORTABLE - it uses only Node.js built-in fetch and can run
 * on any platform with Node.js 18+.
 *
 * Usage: node exchange-token.js <token-endpoint> [options]
 *
 * Arguments:
 *   token-endpoint  The OAuth token endpoint URL
 *
 * Options:
 *   --code=<code>              Authorization code from callback (REQUIRED)
 *   --code-verifier=<verifier> PKCE code_verifier from build-auth-url.js (REQUIRED)
 *   --client-id=<id>           OAuth client ID (REQUIRED)
 *   --redirect-uri=<uri>       Redirect URI used in authorization (REQUIRED)
 *   --client-secret=<secret>   Client secret for confidential clients (optional)
 *
 * Environment Variables (alternative to command-line):
 *   OAUTH_CLIENT_SECRET        Client secret (more secure than command-line)
 *
 * Output: JSON to stdout
 *   Success:
 *   {
 *     "status": "success",
 *     "access_token": "eyJ...",
 *     "token_type": "Bearer",
 *     "expires_in": 3600,
 *     "refresh_token": "...",
 *     "scope": "openid profile"
 *   }
 *
 *   Error:
 *   {
 *     "status": "error",
 *     "error": "invalid_grant",
 *     "error_description": "..."
 *   }
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error
 *
 * SECURITY NOTE:
 *   For confidential clients, prefer using OAUTH_CLIENT_SECRET environment variable
 *   over --client-secret to avoid exposing the secret in process listings.
 *
 * References:
 *   - RFC 6749: OAuth 2.0 Authorization Framework (Section 4.1.3)
 *   - RFC 7636: PKCE (Section 4.5)
 */

// Parse arguments
const tokenEndpoint = process.argv[2];
const args = process.argv.slice(3);

function getArg(name, defaultValue = null) {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : defaultValue;
}

if (!tokenEndpoint) {
    console.log(JSON.stringify({
        status: 'error',
        message: 'Usage: node exchange-token.js <token-endpoint> [options]',
        options: {
            '--code': 'Authorization code from callback (REQUIRED)',
            '--code-verifier': 'PKCE code_verifier from build-auth-url.js (REQUIRED)',
            '--client-id': 'OAuth client ID (REQUIRED)',
            '--redirect-uri': 'Redirect URI used in authorization (REQUIRED)',
            '--client-secret': 'Client secret for confidential clients (optional)'
        },
        example: 'node exchange-token.js https://auth.example.com/token --code=abc123 --code-verifier=xyz789 --client-id=my-client --redirect-uri=http://localhost:3000/callback'
    }, null, 2));
    process.exit(1);
}

const code = getArg('code');
const codeVerifier = getArg('code-verifier');
const clientId = getArg('client-id');
const redirectUri = getArg('redirect-uri');
const clientSecret = getArg('client-secret') || process.env.OAUTH_CLIENT_SECRET;

// Validate required parameters
const missing = [];
if (!code) missing.push('--code');
if (!codeVerifier) missing.push('--code-verifier');
if (!clientId) missing.push('--client-id');
if (!redirectUri) missing.push('--redirect-uri');

if (missing.length > 0) {
    console.log(JSON.stringify({
        status: 'error',
        message: `Missing required parameters: ${missing.join(', ')}`,
        hint: 'Run without arguments to see usage'
    }));
    process.exit(1);
}

async function exchangeToken() {
    // Build request body
    const bodyParams = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
    };

    // Build headers
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    };

    // Handle client authentication
    if (clientSecret) {
        // Confidential client: Use HTTP Basic Authentication
        // This is the preferred method per OAuth 2.0 spec and required by many providers (Keycloak, Auth0)
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    } else {
        // Public client: Include client_id in body
        bodyParams.client_id = clientId;
    }

    // Make token request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers,
            body: new URLSearchParams(bodyParams),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (!response.ok) {
            // OAuth error response
            console.log(JSON.stringify({
                status: 'error',
                http_status: response.status,
                error: responseData.error || 'unknown_error',
                error_description: responseData.error_description || response.statusText,
                hint: responseData.error === 'invalid_client'
                    ? 'The OAuth server rejected the client credentials. If using a confidential client, make sure to provide --client-secret or set OAUTH_CLIENT_SECRET environment variable.'
                    : responseData.error === 'invalid_grant'
                        ? 'The authorization code may have expired or already been used. Start the OAuth flow again.'
                        : null
            }, null, 2));
            process.exit(1);
        }

        // Success!
        const result = {
            status: 'success',
            access_token: responseData.access_token,
            token_type: responseData.token_type || 'Bearer',
            expires_in: responseData.expires_in,
            expires_at: responseData.expires_in
                ? new Date(Date.now() + responseData.expires_in * 1000).toISOString()
                : null
        };

        if (responseData.refresh_token) {
            result.refresh_token = responseData.refresh_token;
        }

        if (responseData.scope) {
            result.scope = responseData.scope;
        }

        if (responseData.id_token) {
            result.id_token = responseData.id_token;
        }

        result.usage = {
            header: `Authorization: Bearer ${responseData.access_token}`,
            note: 'Include this header in requests to the MCP server'
        };

        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.log(JSON.stringify({
                status: 'error',
                message: 'Token exchange request timed out'
            }));
        } else {
            console.log(JSON.stringify({
                status: 'error',
                message: error.message || String(error)
            }));
        }
        process.exit(1);
    }
}

exchangeToken();
