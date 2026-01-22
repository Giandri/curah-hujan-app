import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as cron from "node-cron";

// Configuration
const SCRAPER_CONFIG = {
  url: "https://hkababel.higertech.com/Home/TabelMonitoring",
  dataDir: path.join(process.cwd(), "data"),
  timeout: 90000, // Increased to 90 seconds
  tableTimeout: 60000, // Increased to 60 seconds
  cronSchedule: "*/10 * * * *", // Every 10 minutes
  maxRetries: 3,
  retryDelay: 10000, // 10 seconds between retries
};

// Random user agents for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
];

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(SCRAPER_CONFIG.dataDir)) {
    fs.mkdirSync(SCRAPER_CONFIG.dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${SCRAPER_CONFIG.dataDir}`);
  }
}

// Scraper data interface
interface ScraperData {
  timestamp: string;
  total_records: number;
  source_url: string;
  last_updated: string;
  data: any[];
}

// File rotation manager
class FileRotationManager {
  constructor(private dataDir: string, private filename: string) { }

  private get filepath(): string {
    return path.join(this.dataDir, this.filename);
  }

  rotateFiles(): number {
    try {
      if (fs.existsSync(this.filepath)) {
        fs.unlinkSync(this.filepath);
        console.log(`🗑️ Rotated file: ${this.filename}`);
        return 1;
      }
      return 0;
    } catch (error) {
      console.error(`❌ Error rotating file ${this.filename}:`, error);
      return 0;
    }
  }

  saveData(data: ScraperData): boolean {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filepath, jsonData, "utf8");
      console.log(`💾 Saved ${data.total_records} records to ${this.filename}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving to ${this.filename}:`, error);
      return false;
    }
  }

  loadData(): ScraperData | null {
    try {
      if (!fs.existsSync(this.filepath)) return null;

      const data = JSON.parse(fs.readFileSync(this.filepath, "utf8"));
      return data;
    } catch (error) {
      console.error(`❌ Error loading ${this.filename}:`, error);
      return null;
    }
  }
}

// Create file managers
const fileManagers = {
  dugaAir: new FileRotationManager(SCRAPER_CONFIG.dataDir, "pos_duga_air_latest.json"),
  curahHujan: new FileRotationManager(SCRAPER_CONFIG.dataDir, "pos_curah_hujan_latest.json"),
  klimatologi: new FileRotationManager(SCRAPER_CONFIG.dataDir, "pos_klimatologi_latest.json"),
};

// Helper function to create browser page
async function createBrowserPage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

  return { browser, page };
}

// Scrape POS Duga Air
async function scrapePosDugaAir(): Promise<{ success: boolean; records: number; error?: string }> {
  const timestamp = new Date();
  const timestampStr = timestamp.toLocaleString("id-ID");

  let browser;
  try {
    console.log(`[${timestampStr}] 🚀 Scraping POS DUGA AIR...`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

    console.log(`[${timestampStr}] 📡 Loading page...`);
    await page.goto(SCRAPER_CONFIG.url, { waitUntil: "networkidle2", timeout: SCRAPER_CONFIG.timeout });

    await page.waitForSelector("#awlr-table tbody tr", { timeout: SCRAPER_CONFIG.tableTimeout });

    console.log(`[${timestampStr}] 📊 Extracting data...`);

    const results = await page.evaluate(() => {
      const table = document.querySelector("#awlr-table");
      const headers: string[] = [];
      const headerCells = table?.querySelectorAll("thead tr th, thead tr td");
      headerCells?.forEach((cell) => headers.push(cell.textContent?.trim() || ""));

      const rows = table?.querySelectorAll("tbody tr");
      const data: any[] = [];

      rows?.forEach((row) => {
        const cols = row.querySelectorAll("td");
        if (cols.length > 0) {
          const record: any = {};
          cols.forEach((col, index) => {
            const headerKey = headers[index] || `col_${index}`;
            record[headerKey] = col.textContent?.trim() || "";
          });
          data.push(record);
        }
      });

      return data;
    });

    console.log(`[${timestampStr}] ✅ Extracted ${results.length} records`);

    // Rotate and save
    fileManagers.dugaAir.rotateFiles();
    const dataToSave: ScraperData = {
      timestamp: timestamp.toISOString(),
      total_records: results.length,
      source_url: SCRAPER_CONFIG.url,
      last_updated: timestamp.toISOString(),
      data: results,
    };

    const saved = fileManagers.dugaAir.saveData(dataToSave);

    return { success: saved, records: results.length };
  } catch (error) {
    console.error(`[${timestampStr}] ❌ Error scraping POS DUGA AIR:`, error);
    return { success: false, records: 0, error: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    if (browser) await browser.close();
  }
}

// Scrape POS Curah Hujan
async function scrapePosCurahHujan(): Promise<{ success: boolean; records: number; error?: string }> {
  const timestamp = new Date();
  const timestampStr = timestamp.toLocaleString("id-ID");

  let browser;
  try {
    console.log(`[${timestampStr}] 🌧️ Scraping POS CURAH HUJAN...`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

    console.log(`[${timestampStr}] 📡 Loading page...`);
    await page.goto(SCRAPER_CONFIG.url, { waitUntil: "networkidle2", timeout: SCRAPER_CONFIG.timeout });

    await page.waitForSelector("#arr-table tbody tr", { timeout: SCRAPER_CONFIG.tableTimeout });

    console.log(`[${timestampStr}] 📊 Extracting POS CURAH HUJAN data (including battery)...`);

    const results = await page.evaluate(() => {
      const table = document.querySelector("#arr-table");
      const headers: string[] = [];

      // For POS CURAH HUJAN table, only take headers from first row to avoid multi-row header confusion
      const firstHeaderRow = table?.querySelector("thead tr:first-child");
      if (firstHeaderRow) {
        const headerCells = firstHeaderRow.querySelectorAll("th, td");
        headerCells.forEach((cell) => {
          const headerText = cell.textContent?.trim() || "";
          // Normalize header names for better matching
          if (headerText.includes("BATERAI") || headerText.includes("VOLT")) {
            headers.push("BATERAI(volt)");
          } else {
            headers.push(headerText);
          }
        });
      }

      const rows = table?.querySelectorAll("tbody tr");
      const data: any[] = [];

      rows?.forEach((row) => {
        const cols = row.querySelectorAll("td");
        if (cols.length > 0) {
          const record: any = {};
          cols.forEach((col, index) => {
            const headerKey = headers[index] || `col_${index}`;
            let cellValue = col.textContent?.trim() || "";

            // Special handling for battery/volt data
            if (headerKey === "BATERAI(volt)" || headerKey.includes("BATERAI")) {
              // Extract numeric value if possible
              const numericMatch = cellValue.match(/(\d+\.?\d*)/);
              if (numericMatch) {
                cellValue = numericMatch[1];
              } else if (cellValue === "" || cellValue === "-") {
                cellValue = "0"; // Default for empty battery data
              }
            }

            record[headerKey] = cellValue;
          });
          data.push(record);
        }
      });

      return data;
    });

    console.log(`[${timestampStr}] ✅ Extracted ${results.length} POS CURAH HUJAN records`);

    // Log battery data for verification
    if (results.length > 0) {
      const sampleRecord = results[0];
      console.log(
        `[${timestampStr}] 🔋 Battery data sample: ${JSON.stringify({
          name: sampleRecord["NAMA POS"],
          battery: sampleRecord["BATERAI(volt)"] || sampleRecord["BATERAI"] || "Not found",
        })}`
      );
    }

    // Rotate and save
    fileManagers.curahHujan.rotateFiles();
    const dataToSave: ScraperData = {
      timestamp: timestamp.toISOString(),
      total_records: results.length,
      source_url: SCRAPER_CONFIG.url,
      last_updated: timestamp.toISOString(),
      data: results,
    };

    const saved = fileManagers.curahHujan.saveData(dataToSave);

    return { success: saved, records: results.length };
  } catch (error) {
    console.error(`[${timestampStr}] ❌ Error scraping POS CURAH HUJAN:`, error);
    return { success: false, records: 0, error: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    if (browser) await browser.close();
  }
}

// Scrape POS Klimatologi
async function scrapePosKlimatologi(): Promise<{ success: boolean; records: number; error?: string }> {
  const timestamp = new Date();
  const timestampStr = timestamp.toLocaleString("id-ID");

  let browser;
  try {
    console.log(`[${timestampStr}] 🌤️ Scraping POS KLIMATOLOGI...`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

    console.log(`[${timestampStr}] 📡 Loading page...`);
    await page.goto(SCRAPER_CONFIG.url, { waitUntil: "networkidle2", timeout: SCRAPER_CONFIG.timeout });

    await page.waitForSelector("#aws-table tbody tr", { timeout: SCRAPER_CONFIG.tableTimeout });

    console.log(`[${timestampStr}] 📊 Extracting POS KLIMATOLOGI data with explicit column mapping...`);

    const results = await page.evaluate(() => {
      const table = document.querySelector("#aws-table");
      const rows = table?.querySelectorAll("tbody tr");
      const data: any[] = [];

      // Helper function to clean text (remove extra whitespace and newlines)
      const cleanText = (text: string | null | undefined): string => {
        return (text || "").replace(/\s+/g, " ").trim();
      };

      // Helper to extract numeric value from string like "99.9%Sangat Lembab"
      const extractNumeric = (text: string): string => {
        const match = text.match(/(\d+\.?\d*)/);
        return match ? match[1] : text;
      };

      // Helper to extract status from kelembapan like "99.9%Sangat Lembab" -> "Sangat Lembab"
      const extractStatus = (text: string): string => {
        return text.replace(/[\d.%]+/g, "").trim();
      };

      // Explicit column mapping based on table structure:
      // 0: No., 1: Nama Pos, 2: Tanggal, 3: Jam, 4: Kelembapan,
      // 5: Curah Hujan Per 5 Menit, 6: Curah Hujan 1 Jam Terakhir, 7: Tekanan(MB),
      // 8: Radiasi Matahari, 9: Lama Penyinaran, 10: Suhu(°C),
      // 11: Arah Angin, 12: Kecepatan Angin(km/h), 13: Tinggi Penguapan(mm), 14: Baterai(Volt)
      rows?.forEach((row) => {
        const cols = row.querySelectorAll("td");
        if (cols.length > 0) {
          const kelembapanRaw = cols[4]?.textContent?.trim() || "";
          const curahHujan1JamRaw = cols[6]?.textContent?.trim() || "";

          const record: any = {
            "No.": cols[0]?.textContent?.trim() || "",
            "Nama Pos": cols[1]?.textContent?.trim() || "",
            "Tanggal": cols[2]?.textContent?.trim() || "",
            "Jam": cols[3]?.textContent?.trim() || "",
            "Kelembapan": extractNumeric(kelembapanRaw),
            "Kelembapan Status": extractStatus(kelembapanRaw),
            "Curah Hujan Per 5 Menit": cols[5]?.textContent?.trim() || "",
            "Curah Hujan 1 Jam Terakhir": extractNumeric(curahHujan1JamRaw.replace(/mm/gi, "")),
            "Curah Hujan Status": extractStatus(curahHujan1JamRaw.replace(/[\d.]+\s*mm/gi, "")),
            "Tekanan(MB)": cols[7]?.textContent?.trim() || "",
            "Radiasi Matahari": cols[8]?.textContent?.trim() || "",
            "Lama Penyinaran": cols[9]?.textContent?.trim() || "",
            "Suhu(°C)": cols[10]?.textContent?.trim() || "",
            "Arah Angin": cleanText(cols[11]?.textContent), // Clean newlines
            "Kecepatan Angin(km/h)": cols[12]?.textContent?.trim() || "",
            "Tinggi Penguapan(mm)": cols[13]?.textContent?.trim() || "",
            "Baterai(Volt)": cols[14]?.textContent?.trim() || "",
          };
          data.push(record);
        }
      });

      return data;
    });

    console.log(`[${timestampStr}] ✅ Extracted ${results.length} records`);

    // Rotate and save
    fileManagers.klimatologi.rotateFiles();
    const dataToSave: ScraperData = {
      timestamp: timestamp.toISOString(),
      total_records: results.length,
      source_url: SCRAPER_CONFIG.url,
      last_updated: timestamp.toISOString(),
      data: results,
    };

    const saved = fileManagers.klimatologi.saveData(dataToSave);

    return { success: saved, records: results.length };
  } catch (error) {
    console.error(`[${timestampStr}] ❌ Error scraping POS KLIMATOLOGI:`, error);
    return { success: false, records: 0, error: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    if (browser) await browser.close();
  }
}

// Run all scrapers sequentially
async function runAllScrapers(): Promise<{
  dugaAir: { success: boolean; records: number; error?: string };
  curahHujan: { success: boolean; records: number; error?: string };
  klimatologi: { success: boolean; records: number; error?: string };
}> {
  console.log("\n🔄 Starting scheduled scraping...\n");

  // Scrape POS Duga Air
  const dugaAir = await scrapePosDugaAir();
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay 2 seconds

  // Scrape POS Curah Hujan
  const curahHujan = await scrapePosCurahHujan();
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay 2 seconds

  // Scrape POS Klimatologi
  const klimatologi = await scrapePosKlimatologi();

  console.log("\n✅ Scheduled scraping completed!\n");

  return { dugaAir, curahHujan, klimatologi };
}

// Cron job management
let cronJob: cron.ScheduledTask | null = null;
let isCronActive = false;

// Start cron job
function startCronJob() {
  if (isCronActive) {
    console.log("⏰ Cron job already active");
    return;
  }

  console.log("🚀 Starting cron job scheduler...");

  cronJob = cron.schedule(SCRAPER_CONFIG.cronSchedule, async () => {
    console.log(`\n⏰ [${new Date().toLocaleString("id-ID")}] Running scheduled scraping...`);
    await runAllScrapers();
  });

  isCronActive = true;
  console.log("✅ Cron job scheduler started");
}

// Stop cron job
function stopCronJob() {
  if (cronJob && isCronActive) {
    console.log("🛑 Stopping cron job scheduler...");
    cronJob.stop();
    cronJob = null;
    isCronActive = false;
    console.log("✅ Cron job scheduler stopped");
  }
}

// Get cron status
function getCronStatus() {
  return {
    active: isCronActive,
    schedule: SCRAPER_CONFIG.cronSchedule,
    description: "Every 10 minutes",
    dataDir: SCRAPER_CONFIG.dataDir,
  };
}

// Initialize scraper on startup (development and production)
function initializeScraper() {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  console.log(`🏭 Initializing scraper (${isProduction ? "production" : "development"} mode)...`);

  // Ensure data directory exists
  ensureDataDir();

  // Run initial scraping
  runAllScrapers()
    .then(() => {
      // Start cron job in both production and development
      startCronJob();

      console.log("\n🎯 Scraper initialized successfully!");
      console.log(`📅 Schedule: ${SCRAPER_CONFIG.cronSchedule} (${getCronStatus().description})`);
      console.log(`🌍 Mode: ${isProduction ? "Production" : "Development"}`);
    })
    .catch((error) => {
      console.error("❌ Failed to initialize scraper:", error);
    });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, stopping cron job...");
  stopCronJob();
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, stopping cron job...");
  stopCronJob();
});

// Manual trigger function for API
export async function runManualScrape() {
  console.log("🔄 Manual scraping triggered via API...");
  try {
    const results = await runAllScrapers();
    return {
      success: true,
      message: "Manual scraping completed",
      data: results,
    };
  } catch (error) {
    console.error("❌ Manual scraping failed:", error);
    return {
      success: false,
      message: "Manual scraping failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export functions
export { initializeScraper, startCronJob, stopCronJob, getCronStatus, runAllScrapers, scrapePosDugaAir, scrapePosCurahHujan, scrapePosKlimatologi, fileManagers };
