#!/usr/bin/env node

/**
 * Standalone scraper runner
 * Usage: node scripts/run-scraper.js
 */

const path = require("path");

// Import scraper functions
async function runScraper() {
  try {
    console.log("🔄 Starting manual scraper execution...");

    // Use npx to run TypeScript directly
    const { spawn } = require("child_process");

    const child = spawn("npx", ["tsx", "src/lib/scraper/index.ts"], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });

    const exitCode = await new Promise((resolve) => {
      child.on("close", resolve);
    });

    if (exitCode === 0) {
      console.log("✅ Scraper execution completed successfully");
      process.exit(0);
    } else {
      throw new Error(`Scraper exited with code ${exitCode}`);
    }
  } catch (error) {
    console.error("❌ Scraper execution failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScraper();
}

module.exports = { runScraper };
