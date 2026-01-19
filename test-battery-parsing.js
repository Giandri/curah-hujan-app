// Test script untuk verifikasi parsing data baterai POS Curah Hujan

// Simulate table data extraction
function simulateBatteryParsing() {
  // Mock headers dari website
  const mockHeaders = [
    "NO.", "NAMA POS", "ID LOGGER", "LOKASI", "WS", "DAS",
    "TANGGAL", "JAM (WIB)", "1 JAM TERAKHIR", "AKUMULASI 1 HARI",
    "BATERAI(volt)", "CH (mm)", "INTENSITAS"
  ];

  // Mock row data
  const mockRowData = [
    "1", "PCH BENDUNG MENTUKUL", "HGT137", "Kab. Bangka Selatan, Kec. Toboali, Jeriji",
    "Bangka", "Das Bikang", "14 Januari 2026", "09:45", "0", "Tidak Hujan",
    "12.5", "Tidak Hujan", "13.02"  // Battery value: 12.5V
  ];

  // Simulate parsing logic
  const record = {};
  mockRowData.forEach((cellValue, index) => {
    const headerKey = mockHeaders[index] || `col_${index}`;
    let finalValue = cellValue.trim();

    // Special handling for battery/volt data
    if (headerKey === "BATERAI(volt)" || headerKey.includes("BATERAI")) {
      // Extract numeric value if possible
      const numericMatch = finalValue.match(/(\d+\.?\d*)/);
      if (numericMatch) {
        finalValue = numericMatch[1];
      } else if (finalValue === "" || finalValue === "-") {
        finalValue = "0"; // Default for empty battery data
      }
    }

    record[headerKey] = finalValue;
  });

  console.log("🔋 Test Result - Battery Parsing:");
  console.log(JSON.stringify({
    name: record['NAMA POS'],
    battery: record['BATERAI(volt)'],
    originalValue: mockRowData[10], // Original battery value
    parsedValue: record['BATERAI(volt)']
  }, null, 2));

  return record;
}

// Test multiple battery formats
function testMultipleBatteryFormats() {
  const testCases = [
    { input: "12.5", expected: "12.5", description: "Normal voltage" },
    { input: "12.5V", expected: "12.5", description: "With V suffix" },
    { input: "12.50 volt", expected: "12.50", description: "With volt suffix" },
    { input: "", expected: "0", description: "Empty value" },
    { input: "-", expected: "0", description: "Dash value" },
    { input: "N/A", expected: "N/A", description: "N/A value" },
    { input: "13.2", expected: "13.2", description: "Another voltage" }
  ];

  console.log("🧪 Testing Multiple Battery Formats:\n");

  testCases.forEach((testCase, index) => {
    const mockHeaders = ["BATERAI(volt)"];
    const mockRowData = [testCase.input];

    const record = {};
    mockRowData.forEach((cellValue, idx) => {
      const headerKey = mockHeaders[idx];
      let finalValue = cellValue.trim();

      if (headerKey === "BATERAI(volt)" || headerKey.includes("BATERAI")) {
        const numericMatch = finalValue.match(/(\d+\.?\d*)/);
        if (numericMatch) {
          finalValue = numericMatch[1];
        } else if (finalValue === "" || finalValue === "-") {
          finalValue = "0";
        }
      }

      record[headerKey] = finalValue;
    });

    const result = record["BATERAI(volt)"];
    const status = result === testCase.expected ? "✅" : "❌";

    console.log(`${status} Test ${index + 1}: "${testCase.input}" → "${result}" (${testCase.description})`);
  });
}

// Run tests
console.log("🧪 Testing Battery Data Parsing for POS Curah Hujan\n");
simulateBatteryParsing();

console.log("\n" + "=".repeat(50) + "\n");
testMultipleBatteryFormats();

console.log("\n✅ All tests completed!");
