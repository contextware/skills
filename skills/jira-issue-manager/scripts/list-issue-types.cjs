#!/usr/bin/env node

/**
 * list-issue-types.cjs
 *
 * Lists all issue types available for a specific Jira project.
 * Fixes the hardcoded projectId issue from the previous version.
 *
 * PORTABLE: Uses only Node.js built-in fetch (Node 18+). No external dependencies.
 * SECURE: Secrets passed via environment variables, never as CLI arguments.
 *
 * Usage:
 *   NANGO_SECRET_KEY=your_key node list-issue-types.cjs <cloudId> <projectId> <connectionId>
 *
 * Environment Variables:
 *   - NANGO_SECRET_KEY (required): Your Nango secret key
 *   - NANGO_HOST (optional): Nango API host, defaults to 'https://api.nango.dev'
 *
 * Arguments:
 *   - cloudId: Jira Cloud ID from discover-cloud-id.cjs
 *   - projectId: Project ID from list-projects.cjs
 *   - connectionId: Nango connection ID
 *
 * Output (JSON):
 *   Success:
 *   [
 *     {
 *       "id": "10011",
 *       "name": "Story",
 *       "subtask": false
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
const projectId = process.argv[3];
const connectionId = process.argv[4];

if (!NANGO_SECRET_KEY) {
    console.log(JSON.stringify({
        error: 'NANGO_SECRET_KEY environment variable is required'
    }));
    process.exit(1);
}

if (!cloudId || !projectId || !connectionId) {
    console.log(JSON.stringify({
        error: 'Usage: NANGO_SECRET_KEY=your_key node list-issue-types.cjs <cloudId> <projectId> <connectionId>',
        example: 'NANGO_SECRET_KEY=sk_xxx node list-issue-types.cjs efe59576-1147-4e4b-96b5-7615e308a36b 10001 jira-abc123'
    }));
    process.exit(1);
}

async function listIssueTypes() {
    try {
        // Call the Jira issue type endpoint for the specific project via Nango proxy
        // This fixes the hardcoded projectId=10001 from the old version
        const apiUrl = `${NANGO_HOST}/proxy/ex/jira/${cloudId}/rest/api/3/issuetype/project?projectId=${projectId}`;

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

        const issueTypes = await response.json();

        if (!Array.isArray(issueTypes) || issueTypes.length === 0) {
            console.log(JSON.stringify({
                error: 'No issue types found for this project',
                hint: 'The project may not have any issue types configured'
            }));
            process.exit(1);
        }

        // Extract relevant issue type information
        const formattedIssueTypes = issueTypes.map(issueType => ({
            id: issueType.id,
            name: issueType.name,
            subtask: issueType.subtask || false,
            description: issueType.description || null
        }));

        console.log(JSON.stringify(formattedIssueTypes, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            error: error.message || String(error)
        }));
        process.exit(1);
    }
}

listIssueTypes();
