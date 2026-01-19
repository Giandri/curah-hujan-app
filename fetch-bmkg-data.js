const https = require('https');

console.log('🔍 Fetching actual BMKG webpage data...\n');

const url = 'https://www.bmkg.go.id/cuaca/prakiraan-cuaca';

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);

  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('\n📄 Raw HTML sample (first 2000 chars):');
    console.log(data.substring(0, 2000));

    // Look for weather data patterns
    const tempMatches = data.match(/\d{1,2}°C/g);
    console.log('\n🌡️ Temperature matches found:', tempMatches ? tempMatches.length : 0);
    if (tempMatches) console.log('Sample temps:', tempMatches.slice(0, 10));

    const cityMatches = data.match(/(Pangkalpinang|Muntok|Toboali|Sungai Liat|Koba)/gi);
    console.log('🏙️ City matches found:', cityMatches);

    // Look for JSON data in script tags
    const scriptMatches = data.match(/var\s+\w+\s*=\s*\[.*?\];/gs);
    if (scriptMatches) {
      console.log('\n📊 Script data found:', scriptMatches.length, 'scripts');
      scriptMatches.slice(0, 2).forEach((script, i) => {
        console.log(`Script ${i + 1}:`, script.substring(0, 200) + '...');
      });
    }

    // Look for weather condition keywords
    const weatherKeywords = data.match(/(Cerah|Berawan|Hujan|Petir|Mendung)/gi);
    console.log('\n🌤️ Weather conditions found:', weatherKeywords ? weatherKeywords.slice(0, 10) : []);

    // Look for structured data
    const jsonMatches = data.match(/\{[^}]*"[^"]*":[^}]*\}/g);
    if (jsonMatches) {
      console.log('\n🔧 JSON-like data found:', jsonMatches.length, 'matches');
      jsonMatches.slice(0, 3).forEach((json, i) => {
        console.log(`JSON ${i + 1}:`, json.substring(0, 100));
      });
    }
  });
}).on('error', (err) => {
  console.error('❌ Error:', err.message);
}).setTimeout(15000);
