const cloudId = process.argv[2];
const nangoSecretKey = process.argv[3];
const connectionId = process.argv[4];
const provider = process.argv[5] || 'jira';
const projectId = process.argv[6];

if (!cloudId || !nangoSecretKey || !connectionId) {
    console.error("Usage: node get-issue-types.js <cloudId> <NANGO_SECRET_KEY> <connectionId> [provider] [projectId]");
    process.exit(1);
}

const nangoHost = process.env.NANGO_HOST || 'https://api.nango.dev';
let apiUrl = `${nangoHost}/proxy/ex/jira/${cloudId}/rest/api/3/issuetype`;

if (projectId) {
    // If projectId is provided, we can use the project-specific endpoint
    apiUrl = `${nangoHost}/proxy/ex/jira/${cloudId}/rest/api/3/issuetype/project?projectId=${projectId}`;
}

fetch(apiUrl, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${nangoSecretKey}`,
        'Connection-Id': connectionId,
        'Provider-Config-Key': provider,
    }
})
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (Array.isArray(data)) {
            const issueTypes = data.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description
            }));
            console.log(JSON.stringify(issueTypes));
        } else {
            console.log(JSON.stringify(data));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        console.log(JSON.stringify({ error: error.message }));
        process.exit(1);
    });