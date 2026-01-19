import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for scraper operations
export const runtime = "nodejs";

// Interface untuk trigger response
interface TriggerResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// POST /api/scraper/trigger - Manual trigger scraping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log("🎮 API Trigger: Manual scraping requested", { action });

    if (action === "run-now") {
      // Run scraper directly using dynamic import
      try {
        console.log("🔄 Starting scraping via dynamic import...");

        // Import scraper directly
        const { runAllScrapers } = await import("../../../../lib/scraper/index");

        console.log("🔄 Executing runAllScrapers...");
        const result = await runAllScrapers();

        console.log("✅ Scraping completed successfully");

        const response: TriggerResponse = {
          success: true,
          message: "Manual scraping completed successfully",
          data: {
            result: result,
            timestamp: new Date().toISOString(),
            action: "run-now",
          },
        };

        return NextResponse.json(response, { status: 200 });
      } catch (scraperError) {
        console.error("❌ Scraper execution failed:", scraperError);

        const errorResponse: TriggerResponse = {
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

    // Default response for other actions
    const response: TriggerResponse = {
      success: true,
      message: "Scraping is integrated into the main application",
      data: {
        status: "integrated",
        note: "Data scraping runs automatically when the application starts",
        action: action || "unknown",
        available_actions: ["run-now"],
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ API Trigger Error:", error);

    const errorResponse: TriggerResponse = {
      success: false,
      message: "Request processing failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// GET /api/scraper/trigger - Startup trigger
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "startup") {
    console.log("🚀 API Trigger: Startup scraping requested");

    // For startup, run a quick scraping check
    try {
      const { runAllScrapers } = await import("../../../../lib/scraper/index");

      console.log("🔄 Running startup scraping...");
      const result = await runAllScrapers();

      console.log("✅ Startup scraping completed");

      return NextResponse.json({
        success: true,
        message: "Startup scraping completed successfully",
        data: {
          result: result,
          timestamp: new Date().toISOString(),
          action: "startup",
        },
      });
    } catch (scraperError) {
      console.error("❌ Startup scraping failed:", scraperError);

      return NextResponse.json(
        {
          success: false,
          message: "Startup scraping failed, but app continues",
          error: scraperError instanceof Error ? scraperError.message : "Unknown error",
          data: {
            timestamp: new Date().toISOString(),
            action: "startup",
          },
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: "Trigger endpoint ready",
    data: {
      status: "integrated",
      available_actions: ["startup"],
    },
  });
}
