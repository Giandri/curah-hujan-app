import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Force Node.js runtime for scraper operations
export const runtime = "nodejs";

// Path ke folder data scraper
const SCRAPER_DATA_DIR = path.join(process.cwd(), "data");

// Interface untuk data scraper
interface ScraperData {
  timestamp: string;
  total_records: number;
  source_url: string;
  last_updated: string;
  data: any[];
}

// Interface untuk response API
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    pos_duga_air?: ScraperData | null;
    pos_curah_hujan?: ScraperData | null;
    pos_klimatologi?: ScraperData | null;
  };
  error?: string;
}

// Helper function untuk membaca file JSON scraper
function readScraperFile(filename: string): ScraperData | null {
  try {
    const filePath = path.join(SCRAPER_DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`File tidak ditemukan: ${filename}`);
      return null;
    }

    const rawData = fs.readFileSync(filePath, "utf8");
    const jsonData: ScraperData = JSON.parse(rawData);

    return jsonData;
  } catch (error) {
    console.error(`Error membaca file ${filename}:`, error);
    return null;
  }
}

// GET /api/scraper - Mengambil semua data scraper
export async function GET(request: NextRequest) {
  try {
    console.log("📡 API Scraper: Mengambil data scraper...");

    // Baca semua file data scraper
    const posDugaAir = readScraperFile("pos_duga_air_latest.json");
    const posCurahHujan = readScraperFile("pos_curah_hujan_latest.json");
    const posKlimatologi = readScraperFile("pos_klimatologi_latest.json");

    // Hitung statistik
    const stats = {
      total_files: [posDugaAir, posCurahHujan, posKlimatologi].filter((d) => d !== null).length,
      pos_duga_air_records: posDugaAir?.total_records || 0,
      pos_curah_hujan_records: posCurahHujan?.total_records || 0,
      pos_klimatologi_records: posKlimatologi?.total_records || 0,
      last_updated: Math.max(posDugaAir ? new Date(posDugaAir.last_updated).getTime() : 0, posCurahHujan ? new Date(posCurahHujan.last_updated).getTime() : 0, posKlimatologi ? new Date(posKlimatologi.last_updated).getTime() : 0),
    };

    const response: ApiResponse = {
      success: true,
      message: "Data scraper berhasil diambil",
      data: {
        pos_duga_air: posDugaAir,
        pos_curah_hujan: posCurahHujan,
        pos_klimatologi: posKlimatologi,
      },
    };

    console.log(`✅ API Scraper: ${stats.total_files} file berhasil dibaca`);
    console.log(`   📊 POS Duga Air: ${stats.pos_duga_air_records} records`);
    console.log(`   🌧️ POS Curah Hujan: ${stats.pos_curah_hujan_records} records`);
    console.log(`   🌤️ POS Klimatologi: ${stats.pos_klimatologi_records} records`);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("❌ API Scraper Error:", error);

    const errorResponse: ApiResponse = {
      success: false,
      message: "Gagal mengambil data scraper",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Note: Dynamic routes are handled in [type]/route.ts
