import { NextRequest, NextResponse } from "next/server";
import path from "path";

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
      // Call scraper via standalone script
      try {
        const { spawn } = await import("child_process");

        const scriptPath = path.join(process.cwd(), "scripts", "run-scraper.js");
        const child = spawn("node", [scriptPath], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        const exitCode = await new Promise((resolve) => {
          child.on("close", resolve);
        });

        if (exitCode === 0) {
          try {
            // Try to parse JSON result
            const result = JSON.parse(stdout.trim());
            return NextResponse.json(
              {
                success: true,
                message: "Manual scraping completed successfully",
                data: result,
              },
              { status: 200 }
            );
          } catch (parseError) {
            // If not JSON, return success with output
            return NextResponse.json(
              {
                success: true,
                message: "Manual scraping completed successfully",
                data: { output: stdout.trim(), stderr: stderr.trim() },
              },
              { status: 200 }
            );
          }
        } else {
          throw new Error(stderr || "Scraper execution failed");
        }
      } catch (error) {
        console.error("❌ Manual scraping failed:", error);
        throw new Error("Failed to execute scraper: " + (error instanceof Error ? error.message : "Unknown error"));
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
