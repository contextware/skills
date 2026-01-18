#!/usr/bin/env node

/**
 * build-auth-url.js
 *
 * Builds an OAuth 2.0 Authorization URL with PKCE (RFC 7636).
 * Generates all necessary parameters including code_verifier for later token exchange.
 *
 * This script is PORTABLE - it uses only Node.js built-in crypto and can run
 * on any platform with Node.js 18+.
 *
 * Usage: node build-auth-url.js <authorization-endpoint> [options]
 *
 * Arguments:
 *   authorization-endpoint  The OAuth authorization endpoint URL
 *
 * Options:
 *   --client-id=<id>        OAuth client ID (default: mcp-client)
 *   --redirect-uri=<uri>    Redirect URI for callback (required)
 *   --scope=<scope>         OAuth scopes (space-separated, optional)
 *   --state=<state>         Custom state parameter (auto-generated if not provided)
 *
 * Output: JSON to stdout
 *   {
 *     "authorization_url": "https://auth.example.com/authorize?...",
 *     "state": "random-state-value",
 *     "code_verifier": "pkce-code-verifier-for-token-exchange",
 *     "code_challenge": "pkce-code-challenge",
 *     "code_challenge_method": "S256",
 *     "client_id": "mcp-client",
 *     "redirect_uri": "https://...",
 *     "scope": "openid profile"
 *   }
 *
 * IMPORTANT: Save the code_verifier! You'll need it when exchanging the
 * authorization code for an access token.
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (invalid arguments)
 *
 * References:
 *   - RFC 7636: Proof Key for Code Exchange (PKCE)
 *   - RFC 6749: OAuth 2.0 Authorization Framework
 */

const crypto = require('crypto');

// Parse arguments
const authEndpoint = process.argv[2];
const args = process.argv.slice(3);

function getArg(name, defaultValue = null) {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : defaultValue;
}

if (!authEndpoint) {
    console.log(JSON.stringify({
        status: 'error',
        message: 'Usage: node build-auth-url.js <authorization-endpoint> [options]',
        options: {
            '--client-id': 'OAuth client ID (default: mcp-client)',
            '--redirect-uri': 'Redirect URI for callback (REQUIRED)',
            '--scope': 'OAuth scopes (space-separated, optional)',
            '--state': 'Custom state parameter (auto-generated if not provided)'
        },
        example: 'node build-auth-url.js https://auth.example.com/authorize --client-id=my-client --redirect-uri=http://localhost:3000/callback --scope="openid profile"'
    }, null, 2));
    process.exit(1);
}

const clientId = getArg('client-id', 'mcp-client');
const redirectUri = getArg('redirect-uri');
const scope = getArg('scope');
const customState = getArg('state');

if (!redirectUri) {
    console.log(JSON.stringify({
        status: 'error',
        message: '--redirect-uri is required',
        hint: 'Example: --redirect-uri=http://localhost:3000/api/mcp/oauth/callback'
    }));
    process.exit(1);
}

/**
 * Generate a cryptographically secure random string (base64url encoded)
 */
function generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate PKCE code_verifier and code_challenge (RFC 7636)
 */
function generatePKCE() {
    // code_verifier: 43-128 character random string
    const codeVerifier = generateRandomString(32);

    // code_challenge: SHA256 hash of code_verifier, base64url encoded
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash.toString('base64url');

    return {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: 'S256'
    };
}

/**
 * Generate OAuth state parameter
 */
function generateState() {
    return generateRandomString(16);
}

function buildAuthorizationUrl() {
    // Generate PKCE and state
    const pkce = generatePKCE();
    const state = customState || generateState();

    // Build URL
    const url = new URL(authEndpoint);

    // Required parameters
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    // PKCE parameters
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

    // Optional scope
    if (scope) {
        url.searchParams.set('scope', scope);
    }

    // Output all information needed for the OAuth flow
    const result = {
        status: 'success',
        authorization_url: url.toString(),
        state: state,
        code_verifier: pkce.codeVerifier,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.codeChallengeMethod,
        client_id: clientId,
        redirect_uri: redirectUri
    };

    if (scope) {
        result.scope = scope;
    }

    // Add instructions
    result.next_steps = [
        '1. Direct user to authorization_url',
        '2. User authenticates and is redirected to redirect_uri with ?code=...&state=...',
        '3. Verify state matches the value above',
        '4. Exchange code for token using code_verifier (see exchange-token.js)'
    ];

    console.log(JSON.stringify(result, null, 2));
}

try {
    buildAuthorizationUrl();
} catch (error) {
    console.log(JSON.stringify({
        status: 'error',
        message: error.message || String(error)
    }));
    process.exit(1);
}
