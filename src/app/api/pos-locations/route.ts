import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const dataPath = path.join(process.cwd(), "data", "lokasi_pos.json");

        if (!fs.existsSync(dataPath)) {
            return NextResponse.json({
                success: false,
                error: "File lokasi_pos.json not found",
                data: []
            }, { status: 404 });
        }

        const fileContent = fs.readFileSync(dataPath, "utf-8");
        const jsonData = JSON.parse(fileContent);

        // Filter only stations with valid coordinates
        const validStations = jsonData.data.filter((station: any) =>
            station.latitude &&
            station.longitude &&
            station.latitude !== "" &&
            station.longitude !== ""
        );

        return NextResponse.json({
            success: true,
            totalStations: jsonData.totalStations,
            validStations: validStations.length,
            data: validStations,
            lastUpdate: jsonData.lastFixTimestamp
        });

    } catch (error: any) {
        console.error("Error reading lokasi_pos.json:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            data: []
        }, { status: 500 });
    }
}
