
const https = require('https');

const codes = [
    "19.05.01.1001", // Muntok / Mentok (Bangka Barat) ?
    "19.05.02.1001",
    "19.02.01.1001", // Current Mentok (likely Belitung/Tanjung Pandan)
    "19.01.01.1001", // Sungailiat
];

console.log("Checking potential codes for Mentok...");

codes.forEach(code => {
    const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${code}`;

    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.lokasi) {
                    console.log(`Code: ${code} -> Kec: ${json.lokasi.kecamatan}, Kota: ${json.lokasi.kota}, Prov: ${json.lokasi.provinsi}`);
                } else {
                    console.log(`Code: ${code} -> No location data found`);
                }
            } catch (e) {
                console.log(`Code: ${code} -> Error parsing JSON`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Code: ${code} -> Request error: ${e.message}`);
    });
});
