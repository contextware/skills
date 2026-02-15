const cloudId = process.argv[2];
const nangoSecretKey = process.argv[3];
const connectionId = process.argv[4];
const provider = process.argv[5] || 'jira';

if (!cloudId || !nangoSecretKey || !connectionId) {
    console.error("Usage: node get-projects.js <cloudId> <NANGO_SECRET_KEY> <connectionId> [provider]");
    process.exit(1);
}

const nangoHost = process.env.NANGO_HOST || 'https://api.nango.dev';
const apiUrl = `${nangoHost}/proxy/ex/jira/${cloudId}/rest/api/3/project`;

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
        const projects = data.map(project => ({
            id: project.id,
            key: project.key,
            name: project.name
        }));
        console.log(JSON.stringify(projects));
    })
    .catch(error => {
        console.error("Error:", error);
        console.log(JSON.stringify({ error: error.message }));
        process.exit(1);
    });
