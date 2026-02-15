/**
 * Nango Authentication Check Script
 *
 * This script checks if a user is authenticated with Nango and returns
 * either the connectionId (if authenticated) or an authUrl (if not).
 *
 * SELF-CONTAINED: Uses only Node.js built-in fetch (Node 18+)
 * No external dependencies required.
 *
 * Required Environment Variables:
 *   - NANGO_SECRET_KEY: Your Nango secret key
 *   - NANGO_DEFAULT_USER_ID: The user ID to check (optional, defaults to 'default-user')
 *   - NANGO_HOST: Nango API host (optional, defaults to 'https://api.nango.dev')
 *
 * Usage:
 *   node check-auth.js [integrationId]
 *
 * Output (JSON):
 *   { "status": "success", "connectionId": "..." }
 *   { "status": "needs_auth", "authUrl": "..." }
 *   { "status": "error", "message": "..." }
 */

const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY;
const NANGO_HOST = process.env.NANGO_HOST || 'https://api.nango.dev';
const USER_ID = process.env.NANGO_DEFAULT_USER_ID || 'default-user';
const INTEGRATION_ID = process.argv[2] || 'hubspot';

async function listConnections(integrationId) {
    const url = new URL('/connection', NANGO_HOST);
    if (integrationId) {
        url.searchParams.set('integrationId', integrationId);
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to list connections: ${response.status} ${text}`);
    }

    return response.json();
}

async function createConnectSession(integrationId, userId) {
    const url = new URL('/connect/session', NANGO_HOST);

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            allowed_integrations: [integrationId],
            end_user: { id: userId }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create connect session: ${response.status} ${text}`);
    }

    return response.json();
}

async function check() {
    // Validate required environment variables
    if (!NANGO_SECRET_KEY) {
        console.log(JSON.stringify({
            status: 'error',
            message: 'NANGO_SECRET_KEY environment variable is required'
        }));
        process.exit(1);
    }

    try {
        // List existing connections for this integration
        const connectionsResult = await listConnections(INTEGRATION_ID);
        const connections = connectionsResult.connections || [];

        // Find a connection for this user (or just the first one if user filtering isn't available)
        const userConnection = connections.find(c => c.end_user_id === USER_ID) || connections[0];

        if (userConnection) {
            console.log(JSON.stringify({
                status: 'success',
                connectionId: userConnection.connection_id,
                integrationId: INTEGRATION_ID,
                endUserId: userConnection.end_user_id
            }));
        } else {
            // No connection found, create a connect session
            const session = await createConnectSession(INTEGRATION_ID, USER_ID);
            console.log(JSON.stringify({
                status: 'needs_auth',
                authUrl: session.data?.connect_link || session.connect_link,
                message: `Please authenticate by visiting the URL above. After authenticating, run this script again.`
            }));
        }
    } catch (e) {
        console.log(JSON.stringify({
            status: 'error',
            message: e.message
        }));
        process.exit(1);
    }
}

check();
