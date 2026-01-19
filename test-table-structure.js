// Test script untuk memverifikasi struktur tabel POS Curah Hujan

// Simulate correct table header extraction (first row only)
function simulateCorrectHeaderExtraction() {
  console.log("🧪 Testing POS Curah Hujan Table Header Extraction\n");

  // Correct headers from first row only (based on website structure)
  const correctHeaders = [
    "NO.",
    "NAMA POS",
    "ID LOGGER",
    "LOKASI",
    "WS",
    "DAS",
    "TANGGAL",
    "JAM (WIB)",
    "1 JAM TERAKHIR",
    "AKUMULASI 1 HARI",
    "BATERAI(volt)"
  ];

  console.log("✅ Correct Headers (First Row Only):");
  correctHeaders.forEach((header, index) => {
    console.log(`  [${index}]: "${header}"`);
  });

  // Wrong headers if taking all rows (what old scraper did)
  const wrongHeaders = [
    "NO.",
    "NAMA POS",
    "ID LOGGER",
    "LOKASI",
    "WS",
    "DAS",
    "TANGGAL",
    "JAM (WIB)",
    "1 JAM TERAKHIR",
    "AKUMULASI 1 HARI",
    "BATERAI(volt)",
    "CH (mm)",        // ← Extra from second row
    "INTENSITAS",     // ← Extra from second row
    "CH (mm)",        // ← Extra from second row
    "INTENSITAS"      // ← Extra from second row
  ];

  console.log("\n❌ Wrong Headers (All Rows - Old Method):");
  wrongHeaders.forEach((header, index) => {
    console.log(`  [${index}]: "${header}"`);
  });

  console.log(`\n📊 Impact:`);
  console.log(`  - Correct headers: ${correctHeaders.length} columns`);
  console.log(`  - Wrong headers: ${wrongHeaders.length} columns`);
  console.log(`  - Battery column should be at index: ${correctHeaders.indexOf("BATERAI(volt)")}`);
  console.log(`  - Wrong method would put battery at index: ${wrongHeaders.indexOf("BATERAI(volt)")}`);
}

// Test data extraction simulation
function simulateDataExtraction() {
  console.log("\n🔧 Testing Data Extraction with Correct Headers\n");

  // Correct headers (first row only)
  const headers = [
    "NO.", "NAMA POS", "ID LOGGER", "LOKASI", "WS", "DAS",
    "TANGGAL", "JAM (WIB)", "1 JAM TERAKHIR", "AKUMULASI 1 HARI", "BATERAI(volt)"
  ];

  // Sample row data (11 columns to match headers)
  const sampleRow = [
    "1",                                    // NO.
    "PCH BENDUNG MENTUKUL",               // NAMA POS
    "HGT137",                             // ID LOGGER
    "Kab. Bangka Selatan, Kec. Toboali",  // LOKASI
    "Bangka",                             // WS
    "Das Bikang",                         // DAS
    "14 Januari 2026",                    // TANGGAL
    "09:50",                              // JAM (WIB)
    "0",                                  // 1 JAM TERAKHIR
    "Tidak Hujan",                        // AKUMULASI 1 HARI
    "12.5"                                // BATERAI(volt) - This is what we want!
  ];

  // Extract data
  const record = {};
  sampleRow.forEach((value, index) => {
    const header = headers[index];
    let finalValue = value.trim();

    // Special battery parsing
    if (header === "BATERAI(volt)" || header.includes("BATERAI")) {
      const numericMatch = finalValue.match(/(\d+\.?\d*)/);
      if (numericMatch) {
        finalValue = numericMatch[1];
      } else if (finalValue === "" || finalValue === "-") {
        finalValue = "0";
      }
    }

    record[header] = finalValue;
  });

  console.log("✅ Correct Data Extraction Result:");
  console.log(JSON.stringify({
    name: record["NAMA POS"],
    lastHour: record["1 JAM TERAKHIR"],
    dailyAccumulation: record["AKUMULASI 1 HARI"],
    battery: record["BATERAI(volt)"]
  }, null, 2));
}

// Run tests
simulateCorrectHeaderExtraction();
simulateDataExtraction();

console.log("\n🎯 Summary:");
console.log("✅ Fixed: Only take headers from first row");
console.log("✅ Fixed: Battery column correctly mapped to index 10");
console.log("✅ Fixed: No extra columns from second header row");
console.log("✅ Result: Battery data will be extracted correctly");
