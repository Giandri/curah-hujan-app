// src/app/api/weather/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bmkgApi, MAJOR_LOCATIONS } from "@/lib/bmkg-api";
import * as fs from "fs";
import * as path from "path";

// Disable cache for real-time updates (especially for local JSON file reading)
export const revalidate = 0;

// Mapping NAMA POS ke ADM4 lokasi (synced with MAJOR_LOCATIONS in bmkg-api.ts)
const POS_TO_ADM4: Record<string, string> = {
  "PCH PANGKALPINANG": "19.71.02.1001",
  "PCH SUNGAI LIAT": "19.01.01.1001",
  "PCH MENTOK": "19.05.01.1001",
  "PCH BENDUNG MENTUKUL": "19.03.01.1001",
  "PCH KOBA": "19.04.01.1001",
  "PCH BADAU": "19.02.01.1001",
  "PCH BENDUNG PICE BESAR": "19.06.01.2003",
  "PCH PAYUNG": "19.03.01.1001",
  "PCH MAPUR": "19.01.01.1001",
  "PCH TANJUNG NIUR": "19.05.01.1001",
  "PCH TELAK": "19.05.01.1001",
  "PCH TEPUS": "19.03.01.1001",
  "PCH MENGKUBANG": "19.06.01.2003",
};

// Fungsi untuk membaca data curah hujan dari scraper
function getRainfallDataForAdm4(adm4: string): { lastHour: { value: string; intensity: string }; daily: { value: string; intensity: string } } | null {
  try {
    const dataPath = path.join(process.cwd(), "data", "pos_curah_hujan_latest.json");
    if (!fs.existsSync(dataPath)) return null;

    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (!data.data || !Array.isArray(data.data)) return null;

    // Cari record yang cocok dengan adm4
    for (const record of data.data) {
      const posName = record["NAMA POS"];
      const mappedAdm4 = POS_TO_ADM4[posName];

      if (mappedAdm4 === adm4) {
        const lastHourValue = parseFloat(record["1 JAM TERAKHIR"]) || 0;
        const dailyIntensity = record["AKUMULASI 1 HARI"] || "Tidak Hujan";

        return {
          lastHour: {
            value: lastHourValue.toString(),
            intensity: lastHourValue === 0 ? "0 mm" :
              lastHourValue <= 5 ? "0.1-5 mm" :
                lastHourValue <= 20 ? "5-20 mm" :
                  lastHourValue <= 50 ? "20-50 mm" : ">50 mm",
          },
          daily: {
            value: dailyIntensity,
            intensity: dailyIntensity,
          },
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[Weather API] Error reading rainfall data:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fetchAll = searchParams.get("all") === "true";
  const adm4 = searchParams.get("adm4");

  try {
    // 1. Bulk Fetch (for Map Component)
    if (fetchAll) {
      const locations = Object.values(MAJOR_LOCATIONS);

      const promises = locations.map(async (code) => {
        const weatherData = await bmkgApi.getWeatherForecast(code);
        return { code, weatherData };
      });

      const results = await Promise.all(promises);

      const dataMap: Record<string, any> = {};
      results.forEach((res) => {
        const weather = res.weatherData;
        if (weather?.lokasi && weather.cuaca && weather.cuaca.length > 0) {
          // Use the same current slot selection logic as single endpoint
          const currentSlot = weather.cuaca[0];
          // Use the requested code as key (not weather.lokasi.adm4 which may differ)
          const rainfallData = getRainfallDataForAdm4(res.code);

          dataMap[res.code] = {
            location: {
              ...weather.lokasi,
              adm4: res.code, // Ensure consistent adm4
            },
            current: {
              ...currentSlot,
            },
            rainfallData: rainfallData,
          };
        }
      });

      return NextResponse.json({ success: true, data: dataMap });
    }

    // 2. Single Location Fetch
    const targetAdm4 = adm4 || MAJOR_LOCATIONS.Pangkalpinang;
    const weatherData = await bmkgApi.getWeatherForecast(targetAdm4);

    if (!weatherData) {
      return NextResponse.json({ error: "Failed to retrieve weather data" }, { status: 502 });
    }

    const currentSlot = weatherData.cuaca[0];

    // Process allSlots for forecast data (grouped by day)
    const forecast: any[] = [];
    if (weatherData.allSlots && weatherData.allSlots.length > 0) {
      // Group slots by date
      const slotsByDate: Record<string, any[]> = {};
      weatherData.allSlots.forEach((slot: any) => {
        const date = slot.datetime.split(" ")[0]; // Get YYYY-MM-DD part
        if (!slotsByDate[date]) {
          slotsByDate[date] = [];
        }
        slotsByDate[date].push(slot);
      });

      // Get today's date in Jakarta timezone
      const now = new Date();
      const jakartaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const today = jakartaTime.toISOString().split("T")[0];

      console.log("[API] Today date:", today);
      console.log("[API] Available dates:", Object.keys(slotsByDate).sort());

      // Create daily forecast from grouped slots (include today and future days)
      // BMKG provides 3 days of data, we'll use all available
      Object.keys(slotsByDate)
        .sort()
        .filter(date => date >= today) // Include today and future
        .forEach((date, index) => {
          const daySlots = slotsByDate[date];
          // Use midday slot (12:00) as representative, or first available
          const representativeSlot = daySlots.find(s => s.datetime.includes("12:00")) || daySlots[0];

          // Calculate min/max temps for the day
          const temps = daySlots.map(s => s.t);
          const minTemp = Math.min(...temps);
          const maxTemp = Math.max(...temps);

          forecast.push({
            ...representativeSlot,
            date: date,
            dayIndex: index,
            minTemp: minTemp,
            maxTemp: maxTemp,
            hourlyData: daySlots, // Include all slots for hourly view
          });
        });
    }

    // Get rainfall data from scraper
    const rainfallData = getRainfallDataForAdm4(targetAdm4);

    return NextResponse.json({
      location: weatherData.lokasi,
      current: {
        ...currentSlot,
        // Include today's hourly data if available
        hourlyData: weatherData.allSlots?.filter((slot: any) => {
          const now = new Date();
          const jakartaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
          const today = jakartaTime.toISOString().split("T")[0];
          return slot.datetime.startsWith(today);
        }) || [],
      },
      forecast: forecast,
      rainfallData: rainfallData,
    });
  } catch (error) {
    console.error("[API Route] Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
