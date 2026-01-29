const cloudId = process.argv[2];
const nangoSecretKey = process.argv[3];
const connectionId = process.argv[4];
const provider = process.argv[5];

const apiUrl = `https://api.nango.dev/proxy/ex/jira/${cloudId}/rest/api/3/issuetype/project?projectId=10001`;

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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const issueTypes = data.map(item => ({
            id: item.id,
            name: item.name
        }));
        console.log(JSON.stringify(issueTypes));
    })
    .catch(error => {
        console.error("Error:", error);
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1); // Exit with a non-zero status code to indicate failure
    });