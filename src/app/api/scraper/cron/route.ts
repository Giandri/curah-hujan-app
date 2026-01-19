import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for scraper operations
export const runtime = "nodejs";

// Interface untuk cron control response
interface CronControlResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// POST /api/scraper/cron - Control cron job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log(`🎮 API Cron Control: ${action}`);

    if (action === "run-now") {
      // Run scraper directly using dynamic import (serverless compatible)
      try {
        console.log("🔄 Starting scraping via dynamic import...");

        // Import scraper directly
        const { runAllScrapers } = await import("../../../lib/scraper/index");

        console.log("🔄 Executing runAllScrapers...");
        const result = await runAllScrapers();

        console.log("✅ Scraping completed successfully");

        return NextResponse.json(
          {
            success: true,
            message: "Manual scraping completed successfully",
            data: {
              result: result,
              timestamp: new Date().toISOString(),
              action: "run-now",
            },
          },
          { status: 200 }
        );
      } catch (scraperError) {
        console.error("❌ Scraper execution failed:", scraperError);

        const errorResponse: CronControlResponse = {
          success: false,
          message: "Scraping failed",
          error: scraperError instanceof Error ? scraperError.message : "Unknown error",
          data: {
            timestamp: new Date().toISOString(),
            action: "run-now",
          },
        };

        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    const response: CronControlResponse = {
      success: true,
      message: "Cron functionality is now integrated into the main application",
      data: {
        action: action || "unknown",
        status: "integrated",
        note: "Scraping runs automatically every 10 minutes when the application is running",
        available_actions: ["run-now"],
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ API Cron Control Error:", error);

    const errorResponse: CronControlResponse = {
      success: false,
      message: "Request processing failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// GET /api/scraper/cron - Get cron status
export async function GET(request: NextRequest) {
  try {
    console.log("📊 API Cron Status: Integrated mode");

    const response: CronControlResponse = {
      success: true,
      message: "Cron status - integrated mode",
      data: {
        status: "integrated",
        schedule: "*/10 * * * *",
        description: "Every 10 minutes",
        note: "Scraping runs automatically when application starts",
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("❌ API Cron Status Error:", error);

    const errorResponse: CronControlResponse = {
      success: false,
      message: "Failed to get cron status",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
