
const https = require('https');

// Test with various ADM4 codes - trying different formats for Bangka Belitung
const codes = [
    '19.71.01.1001', // Original code
    '19.05.01',      // README format
    '19.01.01',      // Other locations
    '19.02.01',
    '19.03.01',
    '19.04.01',
    '19.71.01',      // Shortened version
    '19.71',         // Even shorter
    '190501',        // Numeric only
    '190101'
];

function testCode(code) {
    return new Promise((resolve) => {
        const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${code}`;
        console.log(`\n=== Testing ADM4 Code: ${code} ===`);

        const req = https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            },
            timeout: 10000,
            rejectUnauthorized: false
        }, (res) => {
            console.log(`Status: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => data += chunk);

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.message) {
                        console.log(`Response: ${json.message}`);
                    } else {
                        console.log(`Location: ${json.lokasi?.kota || json.lokasi?.kotkab || 'Unknown'}`);
                        console.log(`Weather slots: ${json.cuaca?.length || 0}`);

                        if (json.cuaca && json.cuaca.length > 0) {
                            console.log(`\nFirst 3 time slots:`);
                            json.cuaca.slice(0, 3).forEach((slot, i) => {
                                const time = slot.datetime || slot.local_datetime;
                                console.log(`  ${i+1}. ${time} - ${slot.weather_desc || 'N/A'} (${slot.weather_code || 'N/A'})`);
                            });

                            // Show current time for comparison
                            const now = new Date();
                            console.log(`\nCurrent time: ${now.toISOString()}`);
                        }
                    }
                } catch (e) {
                    console.log(`Parse error: ${e.message}`);
                    console.log(`Raw data: ${data.substring(0, 200)}...`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`Network error: ${e.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log(`Timeout`);
            req.destroy();
            resolve();
        });
    });
}

async function testAllCodes() {
    for (const code of codes) {
        await testCode(code);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between requests
    }
}

testAllCodes();
