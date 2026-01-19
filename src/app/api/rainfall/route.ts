import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// Mapping antara NAMA POS ke lokasi yang dikenal
const POS_TO_LOCATION: Record<string, string[]> = {
    "PCH PANGKALPINANG": ["Pangkalpinang", "19.71.01.1001"],
    "PCH SUNGAI LIAT": ["Sungailiat", "19.01.01.1001"],
    "PCH MENTOK": ["Mentok", "19.02.01.1001"],
    "PCH BENDUNG MENTUKUL": ["Toboali", "19.03.01.1001"],
    "PCH KOBA": ["Koba", "19.04.01.1001"],
    "PCH BADAU": ["Tanjung Pandan", "19.05.01.1001"], // Terdekat ke Tanjung Pandan
    "PCH BENDUNG PICE BESAR": ["Manggar", "19.06.01.1001"],
    "PCH PAYUNG": ["Toboali", "19.03.01.1001"], // Bangka Selatan
    "PCH MAPUR": ["Sungailiat", "19.01.01.1001"], // Bangka area
    "PCH TANJUNG NIUR": ["Mentok", "19.02.01.1001"], // Bangka Barat
    "PCH TELAK": ["Mentok", "19.02.01.1001"], // Bangka Barat
    "PCH TEPUS": ["Toboali", "19.03.01.1001"], // Bangka Selatan
    "PCH MENGKUBANG": ["Manggar", "19.06.01.1001"], // Belitung Timur
};

interface RainfallRecord {
    "NO.": string;
    "NAMA POS": string;
    "ID LOGGER": string;
    "LOKASI": string;
    "WS": string;
    "DAS": string;
    "TANGGAL": string;
    "JAM (WIB)": string;
    "1 JAM TERAKHIR": string;
    "AKUMULASI 1 HARI": string;
    "BATERAI(volt)": string;
}

interface ScraperData {
    timestamp: string;
    total_records: number;
    source_url: string;
    last_updated: string;
    data: RainfallRecord[];
}

// Fungsi untuk mendapatkan intensitas berdasarkan nilai curah hujan
function getRainfallIntensity(value: number): string {
    if (value === 0) return "Tidak Hujan";
    if (value <= 5) return "Hujan Ringan";
    if (value <= 20) return "Hujan Sedang";
    if (value <= 50) return "Hujan Lebat";
    return "Hujan Sangat Lebat";
}

// Fungsi untuk membaca data curah hujan dari JSON
function readRainfallData(): ScraperData | null {
    try {
        const dataDir = path.join(process.cwd(), "data");
        const filePath = path.join(dataDir, "pos_curah_hujan_latest.json");

        if (!fs.existsSync(filePath)) {
            console.log("[Rainfall API] File not found:", filePath);
            return null;
        }

        const fileContent = fs.readFileSync(filePath, "utf8");
        const data: ScraperData = JSON.parse(fileContent);
        return data;
    } catch (error) {
        console.error("[Rainfall API] Error reading file:", error);
        return null;
    }
}

// GET: Ambil data curah hujan
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const adm4 = searchParams.get("adm4");
        const locationName = searchParams.get("location");

        const scraperData = readRainfallData();

        if (!scraperData) {
            return NextResponse.json({
                success: false,
                error: "Rainfall data not available",
                message: "Data curah hujan belum tersedia. Silakan jalankan scraper terlebih dahulu.",
            }, { status: 404 });
        }

        // Jika ada parameter lokasi, filter data
        if (adm4 || locationName) {
            // Cari data berdasarkan adm4 atau nama lokasi
            let matchedRecord: RainfallRecord | null = null;

            for (const record of scraperData.data) {
                const posName = record["NAMA POS"];
                const mapping = POS_TO_LOCATION[posName];

                if (mapping) {
                    const [mappedLocation, mappedAdm4] = mapping;

                    if (adm4 && mappedAdm4 === adm4) {
                        matchedRecord = record;
                        break;
                    }

                    if (locationName && mappedLocation.toLowerCase().includes(locationName.toLowerCase())) {
                        matchedRecord = record;
                        break;
                    }
                }
            }

            if (matchedRecord) {
                const lastHourValue = parseFloat(matchedRecord["1 JAM TERAKHIR"]) || 0;
                const dailyIntensity = matchedRecord["AKUMULASI 1 HARI"] || "Tidak Hujan";

                return NextResponse.json({
                    success: true,
                    data: {
                        posName: matchedRecord["NAMA POS"],
                        location: matchedRecord["LOKASI"],
                        date: matchedRecord["TANGGAL"],
                        time: matchedRecord["JAM (WIB)"],
                        lastHour: {
                            value: lastHourValue.toString(),
                            intensity: getRainfallIntensity(lastHourValue),
                        },
                        daily: {
                            value: dailyIntensity,
                            intensity: dailyIntensity,
                        },
                        battery: matchedRecord["BATERAI(volt)"],
                    },
                    lastUpdated: scraperData.last_updated,
                });
            } else {
                // Tidak ditemukan, return data default
                return NextResponse.json({
                    success: true,
                    data: {
                        posName: "N/A",
                        location: locationName || "Unknown",
                        date: new Date().toLocaleDateString("id-ID"),
                        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                        lastHour: {
                            value: "0",
                            intensity: "Tidak Hujan",
                        },
                        daily: {
                            value: "Tidak Hujan",
                            intensity: "Tidak Hujan",
                        },
                        battery: "N/A",
                    },
                    lastUpdated: scraperData.last_updated,
                    note: "Data tidak tersedia untuk lokasi ini",
                });
            }
        }

        // Return semua data
        const formattedData = scraperData.data.map((record) => {
            const lastHourValue = parseFloat(record["1 JAM TERAKHIR"]) || 0;
            const mapping = POS_TO_LOCATION[record["NAMA POS"]];

            return {
                posName: record["NAMA POS"],
                location: record["LOKASI"],
                mappedLocation: mapping ? mapping[0] : null,
                mappedAdm4: mapping ? mapping[1] : null,
                date: record["TANGGAL"],
                time: record["JAM (WIB)"],
                lastHour: {
                    value: lastHourValue.toString(),
                    intensity: getRainfallIntensity(lastHourValue),
                },
                daily: {
                    value: record["AKUMULASI 1 HARI"],
                    intensity: record["AKUMULASI 1 HARI"],
                },
                battery: record["BATERAI(volt)"],
            };
        });

        return NextResponse.json({
            success: true,
            totalRecords: scraperData.total_records,
            lastUpdated: scraperData.last_updated,
            data: formattedData,
        });

    } catch (error) {
        console.error("[Rainfall API] Error:", error);
        return NextResponse.json({
            success: false,
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
