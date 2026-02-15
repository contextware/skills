#!/usr/bin/env node

/**
 * list-projects.cjs
 *
 * Lists all accessible Jira projects for the authenticated user.
 *
 * PORTABLE: Uses only Node.js built-in fetch (Node 18+). No external dependencies.
 * SECURE: Secrets passed via environment variables, never as CLI arguments.
 *
 * Usage:
 *   NANGO_SECRET_KEY=your_key node list-projects.cjs <cloudId> <connectionId>
 *
 * Environment Variables:
 *   - NANGO_SECRET_KEY (required): Your Nango secret key
 *   - NANGO_HOST (optional): Nango API host, defaults to 'https://api.nango.dev'
 *
 * Arguments:
 *   - cloudId: Jira Cloud ID from discover-cloud-id.cjs
 *   - connectionId: Nango connection ID
 *
 * Output (JSON):
 *   Success:
 *   [
 *     {
 *       "id": "10001",
 *       "key": "PROJ",
 *       "name": "My Project"
 *     },
 *     ...
 *   ]
 *
 *   Error:
 *   {
 *     "error": "Error message"
 *   }
 */

const NANGO_HOST = process.env.NANGO_HOST || 'https://api.nango.dev';
const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY;
const cloudId = process.argv[2];
const connectionId = process.argv[3];

if (!NANGO_SECRET_KEY) {
    console.log(JSON.stringify({
        error: 'NANGO_SECRET_KEY environment variable is required'
    }));
    process.exit(1);
}

if (!cloudId || !connectionId) {
    console.log(JSON.stringify({
        error: 'Usage: NANGO_SECRET_KEY=your_key node list-projects.cjs <cloudId> <connectionId>',
        example: 'NANGO_SECRET_KEY=sk_xxx node list-projects.cjs efe59576-1147-4e4b-96b5-7615e308a36b jira-abc123'
    }));
    process.exit(1);
}

async function listProjects() {
    try {
        // Call the Jira project search endpoint via Nango proxy
        const apiUrl = `${NANGO_HOST}/proxy/ex/jira/${cloudId}/rest/api/3/project/search`;

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

        const data = await response.json();

        // Extract relevant project information
        const projects = (data.values || []).map(project => ({
            id: project.id,
            key: project.key,
            name: project.name,
            projectTypeKey: project.projectTypeKey || null,
            style: project.style || null
        }));

        if (projects.length === 0) {
            console.log(JSON.stringify({
                error: 'No projects found. The authenticated user may not have access to any Jira projects.',
                hint: 'Verify Jira permissions for the authenticated user'
            }));
            process.exit(1);
        }

        console.log(JSON.stringify(projects, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            error: error.message || String(error)
        }));
        process.exit(1);
    }
}

listProjects();
