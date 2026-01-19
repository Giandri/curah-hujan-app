"use client";

import React from "react";
import { Cloud, Sun, Wind, Droplets, Droplet, CloudRain, CloudSun } from "lucide-react";
import { motion } from "framer-motion";
import { bmkgApi } from "@/lib/bmkg-api";
import { useWeatherData } from "@/hooks/use-weather";

// Fungsi untuk mendapatkan keterangan intensitas curah hujan
const getRainIntensityDescription = (intensity: string) => {
  if (!intensity) return "Tidak ada data";

  const cleanIntensity = intensity.toLowerCase().trim();

  if (cleanIntensity.includes("0 mm") || cleanIntensity.includes("tidak")) {
    return "Tidak Hujan";
  }
  if (cleanIntensity.includes("0.1-5") || cleanIntensity.includes("ringan")) {
    return "Hujan Ringan";
  }
  if (cleanIntensity.includes("5-10") || cleanIntensity.includes("sedang")) {
    return "Hujan Sedang";
  }
  if (cleanIntensity.includes("10-20") || cleanIntensity.includes("lebat")) {
    return "Hujan Lebat";
  }
  if (cleanIntensity.includes(">20") || cleanIntensity.includes("sangat lebat")) {
    return "Hujan Sangat Lebat";
  }
  if (cleanIntensity.includes("5-20")) {
    return "Hujan Ringan-Sedang";
  }
  if (cleanIntensity.includes("20-50")) {
    return "Hujan Sedang-Lebat";
  }
  if (cleanIntensity.includes("50-100")) {
    return "Hujan Lebat-Sangat Lebat";
  }
  if (cleanIntensity.includes(">100")) {
    return "Hujan Ekstrem";
  }

  return intensity;
};

// Types
interface WeatherCardProps {
  temperature?: number;
  date?: string;
  windSpeed?: number;
  rainChance?: number;
  humidity?: number;
  useLiveData?: boolean;
  adm4?: string;
  rainfallData?: {
    lastHour?: { value: string; intensity: string };
    daily?: { value: string; intensity: string };
  };
  // Weather data from Maps (for sync when user clicks marker)
  mapsWeatherData?: {
    temp: string;
    condition: string;
    wind: string;
    humidity: string;
    weatherCode: number;
  } | null;
}

// Weather Icon Component with 3D styling and glow
const WeatherIcon: React.FC<{ weatherCode?: number; temperature?: number }> = ({ weatherCode = 1, temperature = 25 }) => {
  const getWeatherVisual = (code: number) => {
    // BMKG weather codes - Standard and Extended
    if (code === 0) return "sunny"; // Cerah - STRICTLY SUN ONLY
    if (code === 1) return "cloudy-sun"; // Cerah Berawan
    if (code === 2 || code === 3) return "cloudy"; // Berawan, Berawan Tebal
    if (code === 4 || code === 60) return "drizzle"; // Hujan Ringan -> Drizzle
    if (code === 5 || code === 6 || code === 61 || code === 63 || code === 8) return "rainy"; // Hujan Sedang/Lebat/Es
    if (code === 7 || code === 95) return "thunder"; // Hujan Petir
    if (code === 9 || code === 10) return "fog"; // Kabut/Asap
    return "cloudy-sun"; // Default
  };

  const weatherType = getWeatherVisual(weatherCode);
  const isSunny = weatherType === "sunny";
  const isDrizzle = weatherType === "drizzle";
  const isFog = weatherType === "fog";
  const isThunder = weatherType === "thunder";
  const isRainy = weatherType === "rainy" || isThunder || isDrizzle;
  const hasCloud = weatherType !== "sunny"; // No cloud for purely sunny weather

  // Determine background glow color
  let glowColor = "bg-linear-to-br from-gray-400/20 to-blue-400/10";
  if (isSunny) glowColor = "bg-linear-to-br from-yellow-400/20 to-orange-400/10";
  else if (isThunder) glowColor = "bg-linear-to-br from-purple-500/20 to-blue-900/10";
  else if (isRainy) glowColor = "bg-linear-to-br from-blue-400/20 to-gray-400/10";
  else if (isFog) glowColor = "bg-linear-to-br from-gray-300/30 to-gray-500/10";

  return (
    <div className="relative w-48 h-48 mx-auto mb-4 animate-float">
      {/* Dynamic glow effect based on weather */}
      <div className={`absolute inset-0 rounded-full blur-3xl animate-pulse-glow ${glowColor}`}></div>

      {/* Sun with glow - for sunny or cloudy-sun weather */}
      {(isSunny || weatherType === "cloudy-sun") && (
        <motion.div className={`absolute ${isSunny ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150" : "top-4 right-4"}`} animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50"></div>
            <Sun className={`${isSunny ? "w-24 h-24" : "w-16 h-16"} text-yellow-400 fill-yellow-400 relative z-10`} />
          </div>
        </motion.div>
      )}

      {/* Cloud - Only if NOT sunny */}
      {hasCloud && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-2xl ${isThunder ? "bg-gray-800/40" : isRainy ? "bg-blue-400/20" : isFog ? "bg-gray-200/20" : "bg-white/20"}`}></div>

            {/* Fog Overlay */}
            {isFog && (
              <motion.div
                initial={{ opacity: 0.4, x: -10 }}
                animate={{ opacity: [0.4, 0.7, 0.4], x: [10, -10, 10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 z-20"
              >
                <Cloud className="w-40 h-40 text-gray-300/50 fill-gray-300/30 blur-md scale-110" />
              </motion.div>
            )}

            <Cloud className={`w-36 h-36 relative z-10 drop-shadow-2xl ${isThunder ? "text-gray-600 fill-gray-600/90" : isRainy ? "text-blue-400 fill-blue-400/90" : isFog ? "text-gray-400 fill-gray-400/80" : "text-foreground fill-foreground/90"}`} />

            {/* Lightning bolt for Thunderstorm */}
            {isThunder && (
              <motion.div className="absolute top-1/2 left-1/2 -ml-2" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3, repeatDelay: Math.random() * 5 }}>
                <svg width="40" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FFD700" stroke="#FFA500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Rain drops - for rainy or thunder weather */}
      {isRainy && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
          {(isDrizzle ? [0, 1] : [0, 1, 2]).map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, 10, 0], opacity: [1, 0.5, 1] }}
              transition={{
                duration: isThunder ? 0.8 : isDrizzle ? 1.5 : 1.2, // Faster for storm, slower for drizzle
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}>
              <Droplet className={`${isDrizzle ? "w-3 h-3" : "w-5 h-5"} text-blue-400 fill-blue-400`} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Weather Stats Component
const WeatherStats: React.FC<{
  windSpeed: number;
  rainChance: number;
  humidity: number;
  rainfallData?: WeatherCardProps["rainfallData"];
}> = ({ windSpeed, rainChance, humidity, rainfallData }) => {
  const stats: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
    subtitle?: string;
  }> = [
      { icon: Wind, label: "Angin", value: `${windSpeed}km/h`, color: "text-cyan-400" },
      { icon: Droplet, label: "Kelembaban", value: `${humidity}%`, color: "text-cyan-300" },
    ];

  // Jika ada data curah hujan, tambahkan sebagai stat utama
  if (rainfallData?.lastHour) {
    const intensityDesc = getRainIntensityDescription(rainfallData.lastHour.intensity);
    stats.unshift({
      icon: CloudRain,
      label: "Curah Hujan",
      value: `${rainfallData.lastHour.value}mm`,
      color: "text-blue-500",
      subtitle: intensityDesc,
    });
  } else {
    // Default rain chance
    stats.splice(1, 0, {
      icon: Droplets,
      label: "Kemungkinan Hujan",
      value: `${rainChance}%`,
      color: "text-blue-400",
    });
  }

  return (
    <div className="mt-6 pt-6 border-t border-foreground/10">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className="p-2 rounded-xl bg-foreground/5 transition-colors">
                <IconComponent className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 transition-colors text-center">{stat.label}</p>
              <p className="text-sm font-semibold text-foreground transition-colors">{stat.value}</p>
              {stat.subtitle && (
                <div className="-mt-3">
                  <span className="text-[9px] text-muted-foreground">{stat.subtitle}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Weather Card Component
const WeatherCard: React.FC<WeatherCardProps> = ({
  temperature,
  date,
  windSpeed,
  rainChance,
  humidity,
  useLiveData = false,
  adm4 = "19.71.02.1001", // Default: Pangkalpinang
  rainfallData,
  mapsWeatherData,
}) => {
  // Get location name from adm4 - using correct ADM4 format from MAJOR_LOCATIONS
  const locationNames: { [key: string]: string } = {
    "19.71.02.1001": "Pangkalpinang",
    "19.01.01.1001": "Sungailiat",
    "19.05.01.1001": "Mentok",
    "19.03.01.1001": "Toboali",
    "19.04.01.1001": "Koba",
    "19.02.01.1001": "Tanjung Pandan",
    "19.06.01.2003": "Manggar",
  };
  const selectedLocation = locationNames[adm4] || "Unknown Location";

  // Use React Query for data fetching - ALWAYS use live data when requested
  const { data: liveData, isLoading: loading, error } = useWeatherData(adm4, useLiveData);

  // Debug logging for received data

  // Simple fallback - used when API fails
  const getFallbackData = (adm4: string, locationName: string) => {
    console.log(`🌡️ Using simple fallback for ${locationName}`);

    // Simple fallback data without complex calculations
    const fallbackTemp = 25.0; // Simple fallback temperature

    // Coordinates - using correct ADM4 format matching MAJOR_LOCATIONS
    const coordinates: { [key: string]: { lat: number; lon: number } } = {
      "19.71.02.1001": { lat: -2.1287, lon: 106.1144 },   // Pangkalpinang
      "19.01.01.1001": { lat: -1.8734, lon: 106.1067 },   // Sungailiat
      "19.05.01.1001": { lat: -2.0637, lon: 105.1618 },   // Mentok
      "19.03.01.1001": { lat: -3.0013, lon: 106.4567 },   // Toboali
      "19.04.01.1001": { lat: -2.4855, lon: 106.4287 },   // Koba
      "19.02.01.1001": { lat: -2.7236, lon: 107.6707 },   // Tanjung Pandan
      "19.06.01.2003": { lat: -2.8738, lon: 108.2687 },   // Manggar
    };

    const coords = coordinates[adm4] || { lat: -2.1333, lon: 106.1167 };

    return {
      location: {
        adm4: adm4,
        provinsi: "KEPULAUAN BANGKA BELITUNG",
        kota: locationName,
        kecamatan: "Kecamatan Pusat",
        lat: coords.lat,
        lon: coords.lon,
      },
      current: {
        datetime: new Date().toISOString(),
        t: fallbackTemp,
        tcc: 75,
        tp: 0,
        wd: 180,
        ws: 8,
        hu: 80,
        weather_desc: "Cerah Berawan",
        weather_code: 1,
        image: "01d",
        data_source: "fallback",
        last_updated: new Date().toISOString(),
      },
      forecast: [],
    };
  };

  // Use API data - the API route already provides improved fallback data
  let weatherData = liveData;

  // The API route should always return valid data (either real BMKG data or improved fallback)
  // If we don't have data here, something is wrong with the data flow
  if (!weatherData || !weatherData.current || !weatherData.location) {
    console.warn(`⚠️ WeatherCard: No weather data available for ${selectedLocation}`);
    // Return early to prevent rendering broken component
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">Weather data unavailable</div>
          <div className="text-sm">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  // Always have data at this point
  const currentData = weatherData.current;
  const locationData = weatherData.location;

  // SYNC FIX: Use mapsWeatherData if available (when user clicked marker)
  // Otherwise use fetched data
  let displayTemp: number;
  let displayCondition: string;
  let displayWindSpeed: number;
  let displayHumidity: number;
  let weatherCode: number;

  if (mapsWeatherData) {
    // Parse data from Maps (string format)
    displayTemp = parseFloat(mapsWeatherData.temp.replace("°C", "")) || 25;
    displayCondition = mapsWeatherData.condition;
    displayWindSpeed = parseFloat(mapsWeatherData.wind.replace(" km/h", "")) || 10;
    displayHumidity = parseFloat(mapsWeatherData.humidity.replace("%", "")) || 80;
    weatherCode = mapsWeatherData.weatherCode;
    console.log("📍 Using Maps weather data for sync:", mapsWeatherData);
  } else {
    // Use fetched data
    displayTemp = Math.round(currentData.t * 10) / 10;
    displayCondition = bmkgApi.getWeatherDescription(currentData.weather_code);
    displayWindSpeed = Math.round(currentData.ws * 10) / 10;
    displayHumidity = Math.round(currentData.hu);
    weatherCode = currentData.weather_code;
  }

  // Calculate rain chance based on BMKG weather codes
  let displayRainChance = 0;

  // BMKG Weather Codes:
  // 0: Cerah, 1: Cerah Berawan, 2: Berawan, 3: Berawan Tebal
  // 4: Hujan Ringan, 5: Hujan Sedang, 6: Hujan Lebat, 7: Hujan Petir, 8: Hujan Es
  if (currentData.weather_code >= 4 && currentData.weather_code <= 8) {
    // Rain codes
    switch (currentData.weather_code) {
      case 4:
        displayRainChance = 40;
        break; // Hujan Ringan
      case 5:
        displayRainChance = 60;
        break; // Hujan Sedang
      case 6:
        displayRainChance = 80;
        break; // Hujan Lebat
      case 7:
        displayRainChance = 90;
        break; // Hujan Petir
      case 8:
        displayRainChance = 95;
        break; // Hujan Es
      default:
        displayRainChance = 50;
    }
  } else if (currentData.weather_code === 3) {
    displayRainChance = 20; // Berawan Tebal - possible rain
  } else if (currentData.weather_code === 2) {
    displayRainChance = 10; // Berawan - slight chance
  } else {
    displayRainChance = 5; // Cerah/Cerah Berawan - very low chance
  }

  // If precipitation data exists, adjust based on tp (precipitation in mm)
  if (currentData.tp !== undefined && currentData.tp > 0) {
    const precipitationChance = Math.min(currentData.tp * 10, 100); // 0.1mm = 10%, 10mm = 100%
    displayRainChance = Math.max(displayRainChance, precipitationChance);
  }

  // weatherCode sudah dideklarasikan di atas (dari mapsWeatherData atau currentData)

  // Get rainfall data from API (scraper data)
  const apiRainfallData = weatherData.rainfallData || rainfallData;

  const currentDate =
    date ||
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="glass-card-dark rounded-[32px] p-6 sm:p-8 shadow-2xl">
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 rounded-[32px] flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white text-sm">Memuat data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 bg-red-500/20 rounded-[32px] flex items-center justify-center z-10">
          <div className="text-center p-4">
            <p className="text-red-200 text-sm font-medium mb-2">Layanan Cuaca Tidak Tersedia</p>
            <p className="text-red-100 text-xs leading-relaxed">
              {error.message?.includes("fetch") || error.message?.includes("network")
                ? "Tidak dapat terhubung ke layanan cuaca BMKG. Periksa koneksi internet Anda."
                : error.message?.includes("CORS")
                  ? "Masalah keamanan browser. Coba refresh halaman atau gunakan browser lain."
                  : "Layanan cuaca BMKG sedang mengalami gangguan. Menampilkan data estimasi."}
            </p>
          </div>
        </div>
      )}

      {/* Weather Icon */}
      <WeatherIcon weatherCode={weatherCode} temperature={displayTemp} />

      {/* Temperature and Condition */}
      <div className="text-center">
        <h1 className="text-8xl font-bold text-foreground text-glow tracking-tight transition-colors">
          {displayTemp.toFixed(1)}
          <span className="text-5xl align-top">°</span>
          <span className="text-4xl font-light">C</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-2 font-medium transition-colors">{displayCondition}</p>
        <p className="text-sm text-muted-foreground/60 mt-1 transition-colors">{currentDate}</p>
        {locationData && (
          <div className="text-xs text-muted-foreground/40 mt-1 space-y-1">
            <p>{locationData.kota}</p>
          </div>
        )}
      </div>

      {/* Weather Statistics */}
      <WeatherStats windSpeed={Math.round(displayWindSpeed)} rainChance={Math.round(displayRainChance)} humidity={Math.round(displayHumidity)} rainfallData={apiRainfallData} />
    </div>
  );
};

export default WeatherCard;
