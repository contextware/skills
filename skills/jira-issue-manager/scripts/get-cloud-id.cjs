const nangoSecretKey = process.argv[2];
const connectionId = process.argv[3];
const provider = process.argv[4] || 'jira';

if (!nangoSecretKey || !connectionId) {
    console.error("Usage: node get-cloud-id.js <NANGO_SECRET_KEY> <connectionId> [provider]");
    process.exit(1);
}

const nangoHost = process.env.NANGO_HOST || 'https://api.nango.dev';
const apiUrl = `${nangoHost}/connection/${connectionId}?provider_config_key=${provider}`;

fetch(apiUrl, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${nangoSecretKey}`
    }
})
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Jira cloudId is often in credentials.raw.site_id or similar
        // We will output the whole connection object if we can't find it, 
        // but primarily we search for common locations.
        const siteId = data.credentials?.raw?.site_id ||
            data.connection_config?.site_id ||
            (data.credentials?.raw && data.credentials.raw[0]?.id); // Some Jira versions return an array of sites in raw

        if (siteId) {
            console.log(JSON.stringify({ cloudId: siteId }));
        } else {
            // If we can't find it automatically, return the whole thing so the agent can inspect
            console.log(JSON.stringify({
                error: "Could not automatically identify cloudId. Please inspect connection details.",
                connectionDetails: data
            }));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        console.log(JSON.stringify({ error: error.message }));
        process.exit(1);
    });
