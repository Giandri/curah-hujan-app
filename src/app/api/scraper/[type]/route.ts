import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Force Node.js runtime for scraper operations
export const runtime = 'nodejs';

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

// GET /api/scraper/[type] - Mengambil data spesifik berdasarkan type
export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  let type: string = "";
  try {
    const paramsData = await params;
    type = paramsData.type;
    console.log(`📡 API Scraper [${type}]: Mengambil data...`);

    let filename: string;
    let label: string;

    switch (type) {
      case "duga-air":
        filename = "pos_duga_air_latest.json";
        label = "POS Duga Air";
        break;
      case "curah-hujan":
        filename = "pos_curah_hujan_latest.json";
        label = "POS Curah Hujan";
        break;
      case "klimatologi":
        filename = "pos_klimatologi_latest.json";
        label = "POS Klimatologi";
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            message: `Type '${type}' tidak valid. Gunakan: duga-air, curah-hujan, atau klimatologi`,
          },
          { status: 400 }
        );
    }

    const data = readScraperFile(filename);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: `Data ${label} tidak ditemukan. Jalankan scraper terlebih dahulu.`,
          data: null,
        },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      message: `Data ${label} berhasil diambil`,
      data: data,
      metadata: {
        type: type,
        label: label,
        filename: filename,
        records: data.total_records,
        last_updated: data.last_updated,
        source_url: data.source_url,
      },
    };

    console.log(`✅ API Scraper [${type}]: ${data.total_records} records berhasil diambil`);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error(`❌ API Scraper [${type}] Error:`, error);

    const errorResponse = {
      success: false,
      message: "Gagal mengambil data scraper",
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
