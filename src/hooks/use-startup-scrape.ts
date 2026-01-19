import { useEffect, useState } from "react";

// Hook untuk auto-trigger scraping saat aplikasi startup
export function useStartupScrape() {
  const [startupTriggered, setStartupTriggered] = useState(false);
  const [startupStatus, setStartupStatus] = useState<{
    triggered: boolean;
    processId?: number;
    message?: string;
    error?: string;
  }>({
    triggered: false,
  });

  useEffect(() => {
    // Hanya trigger sekali saat komponen pertama kali mount
    if (!startupTriggered) {
      triggerStartupScrape();
    }
  }, [startupTriggered]);

  const triggerStartupScrape = async () => {
    try {
      console.log("🚀 Triggering startup initialization...");

      // First, initialize scraper (server-side only)
      try {
        const initResponse = await fetch("/api/scraper/init", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const initData = await initResponse.json();

        if (initData.success) {
          console.log("✅ Scraper initialization:", initData.message);
        } else {
          console.warn("⚠️ Scraper initialization:", initData.message);
        }
      } catch (initError) {
        console.warn("⚠️ Could not initialize scraper (may be normal in development):", initError);
      }

      // Then trigger initial scraping
      console.log("🔄 Triggering startup scraping...");
      const response = await fetch("/api/scraper/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "startup" }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Startup scraping triggered:", data.message);
        setStartupStatus({
          triggered: true,
          message: data.message,
        });
      } else {
        console.error("❌ Startup scraping failed:", data.message);
        setStartupStatus({
          triggered: false,
          error: data.message,
        });
      }
    } catch (error) {
      console.error("❌ Error triggering startup process:", error);
      setStartupStatus({
        triggered: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setStartupTriggered(true);
    }
  };

  const manualTrigger = async () => {
    setStartupTriggered(false); // Reset untuk trigger ulang
  };

  return {
    startupStatus,
    manualTrigger,
  };
}
