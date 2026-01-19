"use client";

import { useStartupScrape } from "@/hooks/use-startup-scrape";
import { useEffect } from "react";

// Komponen untuk trigger scraping saat aplikasi startup
// Komponen ini tidak render apa pun, hanya menjalankan logic di background
export function StartupScraperTrigger() {
  const { startupStatus } = useStartupScrape();

  useEffect(() => {
    if (startupStatus.triggered) {
      console.log("🎉 Startup scraping completed:", startupStatus.message);
    } else if (startupStatus.error) {
      console.warn("⚠️ Startup scraping failed:", startupStatus.error);
    }
  }, [startupStatus]);

  // Komponen ini tidak render apa pun ke UI
  return null;
}
