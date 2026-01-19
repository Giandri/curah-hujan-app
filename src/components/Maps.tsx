"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion, Variants } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Wind, Droplet, Sun, CloudSun, Cloud, CloudRain, Plus, MapPin, CloudLightning, CloudDrizzle, CloudFog } from "lucide-react";
import dynamic from "next/dynamic";
import { renderToString } from "react-dom/server";
import Image from "next/image";
import logoBMKG from "@/assets/images/logo_bmkg.png";

// Dynamically import MapContainer to avoid SSR issues
const DynamicMapContainer = dynamic(() => import("react-leaflet").then((mod) => ({ default: mod.MapContainer })), {
  ssr: false,
  loading: () => (
    <div className="h-80 sm:h-96 md:h-[400px] w-full flex items-center justify-center bg-muted rounded-3xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

// Fix for default marker icons in Next.js
const fixLeafletIcons = () => {
  if (typeof window !== "undefined") {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });


  }
};

// Get weather code from condition (same as Forecast.tsx)
const getWeatherCodeFromCondition = (condition: string): number => {
  switch (condition) {
    case "Cerah":
      return 0;
    case "Cerah Berawan":
      return 1;
    case "Berawan":
      return 2;
    case "Berawan Tebal":
      return 3;
    case "Hujan Ringan":
      return 4;
    case "Hujan Sedang":
      return 5;
    case "Hujan Lebat":
      return 6;
    case "Hujan Petir":
      return 7;
    case "Hujan Es":
      return 8;
    case "Kabut":
      return 9;
    case "Asap":
      return 10;
    default:
      return 1; // Cerah Berawan as default
  }
};

// Get weather icon component (same as Forecast.tsx)
const getWeatherIconComponent = (weatherCode: number) => {
  const iconMap: { [key: number]: any } = {
    // Standard BMKG codes
    0: Sun, // Cerah
    1: CloudSun, // Cerah Berawan
    2: Cloud, // Berawan
    3: Cloud, // Berawan Tebal
    4: CloudDrizzle, // Hujan Ringan
    5: CloudRain, // Hujan Sedang
    6: CloudRain, // Hujan Lebat
    7: CloudLightning, // Hujan Petir
    8: CloudRain, // Hujan Es
    9: CloudFog, // Kabut
    10: CloudFog, // Asap
    // Extended BMKG codes
    60: CloudDrizzle, // Hujan Ringan
    61: CloudRain, // Hujan Sedang
    63: CloudRain, // Hujan Lebat
    95: CloudLightning, // Hujan Petir
  };
  return iconMap[weatherCode] || CloudSun;
};

// WeatherIconMarker component - UPDATED to match WeatherCard.tsx visuals
const WeatherIconMarker: React.FC<{ weatherCode?: number; temperature?: number }> = ({ weatherCode = 1, temperature = 25 }) => {
  const WeatherIcon = getWeatherIconComponent(weatherCode);

  // Determine style based on weather code group for consistent coloring
  let iconColor = "text-gray-100";
  let glowColor = "bg-linear-to-br from-gray-400/20 to-blue-400/10";

  if (weatherCode === 0 || weatherCode === 1) { // Sunny/Partly Sunny
    iconColor = "text-yellow-400 fill-yellow-400/80";
    glowColor = "bg-linear-to-br from-yellow-400/30 to-orange-400/20";
  } else if (weatherCode >= 4 && weatherCode <= 8 || weatherCode >= 60) { // Rain/Thunder
    iconColor = "text-blue-400 fill-blue-400/80";
    glowColor = "bg-linear-to-br from-blue-400/30 to-gray-400/20";
    if (weatherCode === 7 || weatherCode === 95) { // Thunder specifically
      iconColor = "text-yellow-400 fill-yellow-400/80";
      glowColor = "bg-linear-to-br from-purple-500/30 to-yellow-400/20";
    }
  } else if (weatherCode === 9 || weatherCode === 10) { // Fog
    iconColor = "text-gray-400 fill-gray-400/80";
    glowColor = "bg-linear-to-br from-gray-300/30 to-gray-500/20";
  } else { // Cloudy default
    iconColor = "text-gray-200 fill-gray-200/80";
  }

  return (
    <div className="relative w-12 h-12 flex items-center justify-center animate-float animate-fade-in">
      {/* Dynamic glow effect */}
      <div className={`absolute inset-0 rounded-full blur-xl animate-pulse-glow ${glowColor}`}></div>

      {/* Main Icon */}
      <div className="relative z-10 drop-shadow-2xl">
        <WeatherIcon className={`w-10 h-10 ${iconColor}`} />
      </div>

      {/* Temperature badge */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-0.5 rounded-md text-xs font-bold border border-white/20 shadow-lg backdrop-blur-sm z-20">
        {Math.round(temperature)}°
      </div>
    </div>
  );
};

// Create weather icon using WeatherIconMarker component
const createWeatherIcon = (weatherCode: number, temp: string) => {
  // Use weatherCode directly instead of deriving from string
  // Handle cases where temp might be "Estimasi" or other non-numeric values
  let temperature = 25; // Default temperature
  if (temp && typeof temp === "string" && temp.includes("°C")) {
    const parsed = parseFloat(temp.replace("°C", ""));
    if (!isNaN(parsed)) {
      temperature = parsed;
    }
  } else if (temp && typeof temp === "string" && !isNaN(parseFloat(temp))) {
    temperature = parseFloat(temp);
  }

  // Render WeatherIconMarker to HTML string
  const iconHtml = renderToString(<WeatherIconMarker weatherCode={weatherCode} temperature={temperature} />);

  return L.divIcon({
    html: iconHtml,
    className: "leaflet-weather-icon-marker",
    iconSize: [80, 90], // Larger size for the full WeatherIcon component
    iconAnchor: [40, 70], // Center of icon
    popupAnchor: [0, -70], // Point from which the popup should open
  });
};

// Map initializer component to ensure proper setup
function MapInitializer() {
  const map = useMap();

  useEffect(() => {
    if (map) {
      // Force a resize to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // Add error handling for tiles
      const handleTileError = (e: any) => {
        console.warn("Tile loading error:", e);
      };

      const handleMapError = (e: any) => {
        console.error("Map error:", e);
      };

      map.on("tileerror", handleTileError);
      map.on("error", handleMapError);

      // Cleanup
      return () => {
        map.off("tileerror", handleTileError);
        map.off("error", handleMapError);
      };
    }
  }, [map]);

  return null;
}

interface MapsProps {
  onLocationSelect?: (location: {
    name: string;
    adm4: string;
    weather?: {
      temp: string;
      condition: string;
      wind: string;
      humidity: string;
      weatherCode: number;
    };
  }) => void;
}

export default function Maps({ onLocationSelect }: MapsProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [inputLocation, setInputLocation] = useState("");
  const [manualLocations, setManualLocations] = useState<any[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // Kota-kota utama di Bangka Belitung - akan diupdate dengan data real BMKG
  // Format ADM4: 19.XX.XX.XXXX (konsisten dengan MAJOR_LOCATIONS)
  const [bangkaBelitungLocations, setBangkaBelitungLocations] = useState([
    {
      name: "Pangkalpinang",
      type: "Ibu Kota Provinsi",
      adm4: "19.71.02.1001",
      coordinates: [-2.128674720979259, 106.11443757228521] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Sungailiat",
      type: "Kota di Bangka",
      adm4: "19.01.01.1001",
      coordinates: [-1.873373129349491, 106.10668056161362] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Mentok",
      type: "Ibu Kota Bangka Barat",
      adm4: "19.05.01.1001",
      coordinates: [-2.0636736813906045, 105.16179295801321] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Toboali",
      type: "Ibu Kota Bangka Selatan",
      adm4: "19.03.01.1001",
      coordinates: [-3.0013159003079632, 106.45674233288547] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Koba",
      type: "Ibu Kota Bangka Tengah",
      adm4: "19.04.01.1001",
      coordinates: [-2.485520915417998, 106.42869055691324] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Tanjung Pandan",
      type: "Ibu Kota Belitung",
      adm4: "19.02.01.1001",
      coordinates: [-2.723609981605907, 107.67074223866628] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
    {
      name: "Manggar",
      type: "Ibu Kota Belitung Timur",
      adm4: "19.06.01.2003",
      coordinates: [-2.8738301286648635, 108.26867459354571] as LatLngExpression,
      weather: { temp: "Estimasi", condition: "Loading...", wind: "Loading...", humidity: "Loading...", weatherCode: 1 },
    },
  ]);

  // Fetch real weather data for all locations - optimized with BULK FETCH
  // Fetch weather data on mount and every 5 minutes
  useEffect(() => {
    const fetchAllWeatherData = async () => {
      try {
        console.log("[Maps] 🔄 Fetching bulk weather data...");
        // Fetch all data in one go
        const response = await fetch(`/api/weather?all=true`);

        if (!response.ok) throw new Error("API Error");

        const result = await response.json();

        if (result.success && result.data) {
          const weatherMap = result.data;

          const updatedLocations = bangkaBelitungLocations.map((location) => {
            const currentData = weatherMap[location.adm4];

            if (currentData && currentData.current) {
              const current = currentData.current;
              const tempValue = (Math.round(current.t * 10) / 10).toFixed(1);

              return {
                ...location,
                weather: {
                  temp: `${tempValue}°C`,
                  condition: current.weather_desc,
                  wind: `${Math.round(current.ws)} km/h`,
                  humidity: `${Math.round(current.hu)}%`,
                  weatherCode: current.weather_code,
                },
              };
            }
            return location;
          });

          setBangkaBelitungLocations(updatedLocations);
          console.log(
            "✅ Bulk weather data updated for map markers",
            updatedLocations.map((loc) => `${loc.name}: ${loc.weather.temp}`)
          );
        }
      } catch (error) {
        console.warn(`Failed to fetch bulk weather data:`, error);
      }
    };

    // Initial fetch
    fetchAllWeatherData();

    // Set up interval for every 30 seconds (30,000 ms) for realtime updates
    const interval = setInterval(fetchAllWeatherData, 30 * 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []); // Only run once on mount

  // Function to fetch weather data from OpenWeatherMap using coordinates
  const fetchOpenWeatherForCoordinates = async (lat: number, lon: number) => {
    try {
      const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

      if (!OPENWEATHER_API_KEY) {
        throw new Error("OpenWeatherMap API key not found");
      }

      // Fetch current weather from OpenWeatherMap
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=id`);

      if (!response.ok) {
        throw new Error(`OpenWeatherMap API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform OpenWeatherMap data to our BMKG format
      const weatherCode = mapOpenWeatherCodeToBMKG(data.weather[0].id);
      const condition = mapOpenWeatherToBMKG(data.weather[0].main, data.weather[0].description);

      // Create mock forecast data (next 5 days with similar conditions)
      const forecastData = [];
      for (let i = 0; i < 5; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i + 1);

        forecastData.push({
          datetime: forecastDate.toISOString(),
          t: Math.round(data.main.temp + (Math.random() * 4 - 2)), // Slight variation
          tcc: 50 + Math.random() * 30, // Cloud cover
          tp: Math.random() * 10, // Precipitation
          wd: 180 + Math.random() * 180, // Wind direction
          ws: 5 + Math.random() * 10, // Wind speed
          hu: Math.round(data.main.humidity + (Math.random() * 20 - 10)), // Humidity
          weather_desc: condition,
          weather_code: weatherCode,
          image: "01d",
        });
      }

      return {
        lokasi: {
          adm4: "manual",
          provinsi: "LOKASI MANUAL",
          kota: "Lokasi Manual",
          kecamatan: "Manual",
          lat: lat,
          lon: lon,
        },
        cuaca: [
          {
            datetime: data.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString(),
            t: Math.round(data.main.temp),
            tcc: data.clouds?.all || 50,
            tp: data.rain?.["1h"] || 0,
            wd: data.wind?.deg || 180,
            ws: Math.round((data.wind?.speed || 5) * 3.6), // Convert m/s to km/h
            hu: Math.round(data.main.humidity),
            weather_desc: condition,
            weather_code: weatherCode,
            image: "01d",
          },
          ...forecastData,
        ],
      };
    } catch (error) {
      console.error("❌ Error fetching OpenWeather data for coordinates:", error);
      return null;
    }
  };

  // Helper functions to map OpenWeatherMap data to BMKG format
  const mapOpenWeatherToBMKG = (main: string, description: string): string => {
    const mapping: { [key: string]: string } = {
      Clear: "Cerah",
      Clouds: "Berawan",
      Rain: "Hujan",
      Drizzle: "Hujan Ringan",
      Thunderstorm: "Hujan Petir",
      Snow: "Hujan Es",
      Mist: "Kabut",
      Smoke: "Asap",
      Haze: "Kabut",
      Dust: "Kabut",
      Fog: "Kabut",
      Sand: "Kabut",
      Ash: "Asap",
      Squall: "Hujan Petir",
      Tornado: "Hujan Petir",
    };
    return mapping[main] || description;
  };

  const mapOpenWeatherCodeToBMKG = (code: number): number => {
    if (code >= 200 && code < 300) return 7; // Thunderstorm -> Hujan Petir
    if (code >= 300 && code < 400) return 4; // Drizzle -> Hujan Ringan
    if (code >= 500 && code < 600) return 5; // Rain -> Hujan Sedang
    if (code >= 600 && code < 700) return 8; // Snow -> Hujan Es
    if (code >= 700 && code < 800) return 9; // Atmosphere -> Kabut
    if (code === 800) return 0; // Clear -> Cerah
    if (code === 801) return 1; // Few clouds -> Cerah Berawan
    if (code > 801 && code < 900) return 2; // Clouds -> Berawan
    return 1; // Default to Cerah Berawan
  };

  // Function to geocode location names to coordinates
  const geocodeLocation = async (locationName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)},Indonesia&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Function to add a new location
  const addLocation = async () => {
    if (!inputLocation.trim()) return;

    setIsAddingLocation(true);
    try {
      const coordinates = await geocodeLocation(inputLocation.trim());
      if (coordinates) {
        // Try to find weather data for this location
        // For now, we'll use a fallback approach since we don't have exact ADM4 codes
        const newLocation = {
          id: Date.now().toString(),
          name: inputLocation.trim(),
          coordinates: [coordinates.lat, coordinates.lon] as LatLngExpression,
          weather: {
            temp: "Loading...",
            condition: "Loading...",
            wind: "Loading...",
            humidity: "Loading...",
          },
        };

        setManualLocations((prev) => [...prev, newLocation]);
        setInputLocation("");

        // Fetch weather data for the new location
        fetchWeatherForLocation(newLocation.id, coordinates.lat, coordinates.lon);
      } else {
        alert("Lokasi tidak ditemukan. Coba nama lokasi yang lebih spesifik.");
      }
    } catch (error) {
      console.error("Error adding location:", error);
      alert("Gagal menambahkan lokasi. Silakan coba lagi.");
    } finally {
      setIsAddingLocation(false);
    }
  };

  // Function to fetch weather data for a location using BMKG API
  const fetchWeatherForLocation = async (locationId: string, lat: number, lon: number) => {
    try {
      console.log(`🌤️ Fetching weather for location: ${lat}, ${lon}`);

      // Use OpenWeatherMap API directly for coordinates
      const weatherData = await fetchOpenWeatherForCoordinates(lat, lon);

      if (weatherData && weatherData.cuaca && weatherData.cuaca.length > 0) {
        const current = weatherData.cuaca[0]; // Get current weather

        setManualLocations((prev) =>
          prev.map((loc) =>
            loc.id === locationId
              ? {
                ...loc,
                weather: {
                  temp: `${(Math.round(current.t * 10) / 10).toFixed(1)}°C`,
                  condition: current.weather_desc,
                  wind: `${Math.round(current.ws)} km/h`,
                  humidity: `${Math.round(current.hu)}%`,
                  weatherCode: current.weather_code,
                },
              }
              : loc
          )
        );

        console.log(`✅ BMKG weather data loaded for ${locationId}: ${current.t}°C, ${current.weather_desc}`);
      } else {
        throw new Error("No weather data received from BMKG API");
      }
    } catch (error) {
      console.error("❌ Error fetching weather for location:", error);
      // Fallback to basic mock data if something goes wrong
      setManualLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId
            ? {
              ...loc,
              weather: {
                temp: "24°C",
                condition: "Cerah Berawan",
                wind: "10 km/h",
                humidity: "75%",
                weatherCode: 1,
              },
            }
            : loc
        )
      );
    }
  };

  useEffect(() => {
    setIsClient(true);
    // Fix Leaflet icons when component mounts
    fixLeafletIcons();
  }, []);

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  // Default position: Pangkalpinang as center
  const defaultCenter: LatLngExpression = [-2.1287, 106.1144];
  const defaultZoom = 10;

  if (!isClient) {
    return (
      <motion.div variants={itemVariants}>
        <div className="glass-card-dark rounded-3xl overflow-hidden">
          <div className="h-80 sm:h-96 md:h-[400px] w-full flex items-center justify-center">
            <div className="text-foreground text-sm flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="font-medium">Memuat peta...</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (mapError) {
    return (
      <motion.div variants={itemVariants}>
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="h-80 sm:h-96 md:h-[400px] w-full flex items-center justify-center">
            <div className="text-center p-6">
              <div className="text-red-500 mb-2">🗺️</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Map Unavailable</h3>
              <p className="text-sm text-muted-foreground">{mapError}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <div className="glass-card rounded-3xl overflow-hidden relative transition-colors duration-300">
        <div className="h-80 sm:h-96 md:h-[400px] w-full relative">
          {isClient ? (
            <div className="h-full w-full">
              <DynamicMapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: "100%", width: "100%" }}
                className="rounded-2xl z-10"
                whenReady={() => {
                  console.log("Map is ready!");
                }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />

                {/* Weather markers for all Bangka Belitung locations */}
                {bangkaBelitungLocations.map((location, index) => {
                  const weatherIcon = createWeatherIcon(location.weather.weatherCode ?? 1, location.weather.temp);

                  return (
                    <Marker
                      key={index}
                      position={location.coordinates}
                      icon={weatherIcon}
                      eventHandlers={{
                        click: () => {
                          if (onLocationSelect) {
                            onLocationSelect({
                              name: location.name,
                              adm4: location.adm4,
                              weather: location.weather
                            });
                          }
                        },
                      }}>
                      <Popup className="!bg-transparent">
                        <div className="p-4 max-w-[220px] bg-foreground text-background rounded-xl backdrop-blur-md border border-border shadow-xl">
                          <div className="flex items-center gap-2 mb-3">

                            <div>
                              <h3 className="font-bold text-background text-base leading-tight">{location.name}</h3>
                              <p className="text-xs text-background/50">{location.type}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const WeatherLucideIcon = getWeatherIconComponent(location.weather.weatherCode ?? 1);
                                  // Determine icon color based on code (simplified logic from WeatherCard)
                                  const code = location.weather.weatherCode ?? 1;
                                  let iconColor = "text-background";
                                  if (code === 0 || code === 1) iconColor = "text-yellow-400"; // Cerah/Cerah Berawan
                                  else if (code >= 4 && code <= 8 || code >= 60) iconColor = "text-blue-400"; // Hujan
                                  else if (code === 7 || code === 95) iconColor = "text-yellow-400"; 
                                  return <WeatherLucideIcon className={`w-8 h-8 ${iconColor}`} />;
                                })()}
                                <span className="text-2xl font-bold text-background">{location.weather.temp}</span>
                              </div>
                              <span className={`px-2 py-1 ml-2 rounded-lg text-background text-[10px] font-medium ${location.weather.temp === "Estimasi" ? "bg-orange-100 text-orange-700" : "bg-background/10 text-background/80"}`}>{location.weather.condition}</span>
                            </div>

                            <div className="flex gap-4 pt-2 border-t border-background/10">
                              <div className="flex items-center gap-1">
                                <Wind className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs text-background/60">{location.weather.wind}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Droplet className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-background/60">{location.weather.humidity}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Weather markers for manually added locations */}
                {manualLocations.map((location) => {
                  const weatherIcon = createWeatherIcon(location.weather.weatherCode ?? 1, location.weather.temp);

                  return (
                    <Marker
                      key={location.id}
                      position={location.coordinates}
                      icon={weatherIcon}
                      eventHandlers={{
                        click: () => {
                          if (onLocationSelect) {
                            onLocationSelect({ name: location.name, adm4: location.adm4 || "19.71.02.1001" });
                          }
                        },
                      }}>
                      <Popup className="!bg-transparent">
                        <div className="p-4 max-w-[220px] bg-foreground text-background rounded-xl backdrop-blur-md border border-border shadow-xl">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const WeatherLucideIcon = getWeatherIconComponent(location.weather.weatherCode ?? 1);
                                  const code = location.weather.weatherCode ?? 1;
                                  let iconColor = "text-gray-100";
                                  if (code === 0 || code === 1) iconColor = "text-yellow-400";
                                  else if (code >= 4 && code <= 8 || code >= 60) iconColor = "text-blue-400";
                                  else if (code === 7 || code === 95) iconColor = "text-yellow-400";

                                  return <WeatherLucideIcon className={`w-8 h-8 ${iconColor}`} />;
                                })()}
                                <span className="text-2xl font-bold text-foreground">{location.weather.temp}</span>
                              </div>
                              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-foreground/10 text-foreground/80">{location.weather.condition}</span>
                            </div>

                            <div className="flex gap-4 pt-2 border-t border-foreground/10">
                              <div className="flex items-center gap-1">
                                <Wind className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs text-foreground/60">{location.weather.wind}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Droplet className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-foreground/60">{location.weather.humidity}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </DynamicMapContainer>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted rounded-3xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Header Overlay */}
          <div className="absolute top-4 left-4 right-4 z-100 space-y-4 pointer-events-none">
            {/* Map Status */}
            <div className="flex justify-between items-start">
              <div className="glass-card-dark rounded-2xl px-4 py-3 pointer-events-auto">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Map View</span>
                    <span className="text-xs text-muted-foreground">{bangkaBelitungLocations.length + manualLocations.length} locations</span>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl px-3 py-2 pointer-events-auto transition-colors duration-300">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <Image
                      src={logoBMKG}
                      alt="BMKG Logo"
                      width={50}
                      height={50}
                      className="rounded"
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium text-foreground">Data Cuaca Real-time</div>
                      <div className="text-[10px] text-foreground/60">BMKG</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
