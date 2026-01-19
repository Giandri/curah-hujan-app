const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const url = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=19.71.02.1001';

console.log('Fetching data from:', url);

axios.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: agent
})
    .then(response => {
        const data = response.data;
        if (data.data && data.data[0] && data.data[0].cuaca) {
            console.log('Total cuaca items:', data.data[0].cuaca.length);
            const filtered = data.data[0].cuaca.map(c => c.datetime);
            // Show first 2 days worth of data roughly
            console.log('First 40 items datetime:', JSON.stringify(filtered.slice(0, 40), null, 2));

            // Check specifically for 00:00:00 times
            const zeros = filtered.filter(dt => dt.includes('00:00:00'));
            console.log('00:00:00 slots found:', zeros);
        } else {
            console.log('Structure unexpected:', JSON.stringify(data, null, 2).substring(0, 500));
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error.message);
        if (error.response) console.log('Response status:', error.response.status);
    });
