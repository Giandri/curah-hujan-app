
const fetch = require('node-fetch');

const locations = [
    { name: "Pangkalpinang", adm4: "19.71.01.1001" },
    { name: "Sungailiat", adm4: "19.01.01.1001" },
    { name: "Mentok", adm4: "19.02.01.1001" },
    { name: "Toboali", adm4: "19.03.01.1001" }
];

async function testLocations() {
    console.log("Testing weather API for multiple locations...");

    for (const loc of locations) {
        const url = `http://localhost:3000/api/weather?adm4=${loc.adm4}`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const current = data.current;
                console.log(`${loc.name} (${loc.adm4}): ${current.t}°C, ${current.weather_desc}, Hum: ${current.hu}%, Wind: ${current.ws} km/h`);
            } else {
                console.log(`${loc.name}: Error ${response.status}`);
            }
        } catch (err) {
            console.log(`${loc.name}: Fetch failed - ${err.message}`);
        }
    }
}

testLocations();
