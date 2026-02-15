#!/usr/bin/env node

/**
 * discover-cloud-id.cjs
 *
 * Discovers the Jira Cloud ID from an authenticated Nango connection.
 * This eliminates the need for manual dashboard lookups.
 *
 * PORTABLE: Uses only Node.js built-in fetch (Node 18+). No external dependencies.
 * SECURE: Secrets passed via environment variables, never as CLI arguments.
 *
 * Usage:
 *   NANGO_SECRET_KEY=your_key node discover-cloud-id.cjs <connectionId>
 *
 * Environment Variables:
 *   - NANGO_SECRET_KEY (required): Your Nango secret key
 *   - NANGO_HOST (optional): Nango API host, defaults to 'https://api.nango.dev'
 *
 * Arguments:
 *   - connectionId: The Nango connection ID for Jira
 *
 * Output (JSON):
 *   Success:
 *   {
 *     "cloudId": "efe59576-1147-4e4b-96b5-7615e308a36b",
 *     "url": "https://your-domain.atlassian.net",
 *     "name": "Your Jira Instance"
 *   }
 *
 *   Error:
 *   {
 *     "error": "Error message"
 *   }
 */

const NANGO_HOST = process.env.NANGO_HOST || 'https://api.nango.dev';
const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY;
const connectionId = process.argv[2];

if (!NANGO_SECRET_KEY) {
    console.log(JSON.stringify({
        error: 'NANGO_SECRET_KEY environment variable is required'
    }));
    process.exit(1);
}

if (!connectionId) {
    console.log(JSON.stringify({
        error: 'Usage: NANGO_SECRET_KEY=your_key node discover-cloud-id.cjs <connectionId>',
        example: 'NANGO_SECRET_KEY=sk_xxx node discover-cloud-id.cjs jira-abc123'
    }));
    process.exit(1);
}

async function discoverCloudId() {
    try {
        // Call the Jira accessible-resources endpoint via Nango proxy
        // This returns all Jira cloud instances accessible to the authenticated user
        const apiUrl = `${NANGO_HOST}/proxy/oauth/token/accessible-resources`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
                'Connection-Id': connectionId,
                'Provider-Config-Key': 'jira'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const resources = await response.json();

        if (!Array.isArray(resources) || resources.length === 0) {
            throw new Error('No Jira cloud instances found for this connection');
        }

        // Return the first accessible resource (most users have one Jira instance)
        const firstResource = resources[0];

        console.log(JSON.stringify({
            cloudId: firstResource.id,
            url: firstResource.url,
            name: firstResource.name || firstResource.url,
            scopes: firstResource.scopes || []
        }, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            error: error.message || String(error)
        }));
        process.exit(1);
    }
}

discoverCloudId();
