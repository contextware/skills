#!/usr/bin/env node

/**
 * discover-oauth.js
 *
 * Discovers OAuth 2.0 Authorization Server Metadata from an MCP server.
 * Implements RFC 8414 (OAuth 2.0 Authorization Server Metadata).
 *
 * This script is PORTABLE - it uses only Node.js built-in fetch and can run
 * on any platform with Node.js 18+.
 *
 * Usage: node discover-oauth.js <server-url>
 *
 * Arguments:
 *   server-url  The base URL of the MCP server (e.g., https://mcp.example.com)
 *
 * Output: JSON to stdout
 *   Success:
 *   {
 *     "status": "discovered",
 *     "issuer": "https://auth.example.com",
 *     "authorization_endpoint": "https://auth.example.com/authorize",
 *     "token_endpoint": "https://auth.example.com/token",
 *     "scopes_supported": ["openid", "profile"],
 *     "discovery_url": "https://auth.example.com/.well-known/oauth-authorization-server"
 *   }
 *
 *   Not found:
 *   {
 *     "status": "not_found",
 *     "message": "No OAuth metadata found",
 *     "tried": ["url1", "url2"]
 *   }
 *
 * Exit codes:
 *   0 - Success (metadata found or not found)
 *   1 - Error (invalid arguments, network failure)
 *
 * References:
 *   - RFC 8414: OAuth 2.0 Authorization Server Metadata
 *   - OpenID Connect Discovery 1.0
 */

const serverUrl = process.argv[2];

if (!serverUrl) {
    console.log(JSON.stringify({
        status: 'error',
        message: 'Usage: node discover-oauth.js <server-url>',
        example: 'node discover-oauth.js https://mcp.example.com'
    }));
    process.exit(1);
}

/**
 * Normalize URL by removing trailing slashes
 */
function normalizeUrl(url) {
    return url.replace(/\/+$/, '');
}

/**
 * Try to fetch OAuth metadata from a URL
 */
async function tryFetchMetadata(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        clearTimeout(timeoutId);
        return null;
    }
}

/**
 * Extract essential OAuth endpoints from metadata
 */
function extractMetadata(metadata, discoveryUrl) {
    return {
        status: 'discovered',
        issuer: metadata.issuer,
        authorization_endpoint: metadata.authorization_endpoint,
        token_endpoint: metadata.token_endpoint,
        registration_endpoint: metadata.registration_endpoint || null,
        scopes_supported: metadata.scopes_supported || [],
        response_types_supported: metadata.response_types_supported || [],
        grant_types_supported: metadata.grant_types_supported || [],
        code_challenge_methods_supported: metadata.code_challenge_methods_supported || ['S256'],
        discovery_url: discoveryUrl
    };
}

async function discoverOAuth() {
    const baseUrl = normalizeUrl(serverUrl);
    const triedUrls = [];

    // Discovery URLs to try (in order of preference)
    // Per RFC 8414, try oauth-authorization-server first, then OIDC
    const discoveryPaths = [
        '/.well-known/oauth-authorization-server',
        '/.well-known/openid-configuration'
    ];

    // Try discovery on the server URL itself
    for (const path of discoveryPaths) {
        const url = baseUrl + path;
        triedUrls.push(url);

        const metadata = await tryFetchMetadata(url);
        if (metadata && metadata.authorization_endpoint) {
            console.log(JSON.stringify(extractMetadata(metadata, url), null, 2));
            return;
        }
    }

    // If server URL has a path (e.g., https://example.com/mcp), also try the root
    try {
        const parsedUrl = new URL(baseUrl);
        if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
            const rootUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

            for (const path of discoveryPaths) {
                const url = rootUrl + path;
                if (!triedUrls.includes(url)) {
                    triedUrls.push(url);

                    const metadata = await tryFetchMetadata(url);
                    if (metadata && metadata.authorization_endpoint) {
                        console.log(JSON.stringify(extractMetadata(metadata, url), null, 2));
                        return;
                    }
                }
            }
        }
    } catch {
        // URL parsing failed, continue
    }

    // First check if the server requires auth and has WWW-Authenticate header
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(baseUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 401 || response.status === 403) {
            const wwwAuth = response.headers.get('www-authenticate');
            if (wwwAuth) {
                // Parse issuer or authorization_uri from WWW-Authenticate
                const issuerMatch = wwwAuth.match(/issuer="([^"]+)"/i);
                const authUriMatch = wwwAuth.match(/authorization_uri="([^"]+)"/i);
                const realmMatch = wwwAuth.match(/realm="([^"]+)"/i);

                const authServerUrl = issuerMatch?.[1] || authUriMatch?.[1] || realmMatch?.[1];

                if (authServerUrl) {
                    // Try discovery on the auth server
                    const authBase = normalizeUrl(authServerUrl);

                    for (const path of discoveryPaths) {
                        const url = authBase + path;
                        if (!triedUrls.includes(url)) {
                            triedUrls.push(url);

                            const metadata = await tryFetchMetadata(url);
                            if (metadata && metadata.authorization_endpoint) {
                                console.log(JSON.stringify({
                                    ...extractMetadata(metadata, url),
                                    discovered_via: 'www-authenticate-header'
                                }, null, 2));
                                return;
                            }
                        }
                    }
                }

                // Couldn't discover, but we know auth is required
                console.log(JSON.stringify({
                    status: 'requires_auth',
                    message: 'Server requires authentication but OAuth metadata not discoverable',
                    www_authenticate: wwwAuth,
                    tried: triedUrls,
                    hint: 'The server may use a non-standard OAuth configuration. Check server documentation.'
                }, null, 2));
                return;
            }
        }
    } catch {
        // Server probe failed
    }

    // No OAuth metadata found
    console.log(JSON.stringify({
        status: 'not_found',
        message: 'No OAuth metadata found at standard discovery endpoints',
        tried: triedUrls,
        hint: 'The server may not use OAuth, or may use non-standard OAuth configuration.'
    }, null, 2));
}

discoverOAuth().catch(error => {
    console.log(JSON.stringify({
        status: 'error',
        message: error.message || String(error)
    }));
    process.exit(1);
});
