"use client";

import { motion, Variants } from "framer-motion";
import dynamic from "next/dynamic";
import WeatherCard from "@/components/WeatherCard";
import Forecast from "@/components/Forecast";
import Dock from "@/components/Dock";
import Header from "@/components/Header";
import { MapPin, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { MAJOR_LOCATIONS } from "@/lib/bmkg-api";

// Dynamically import Maps component to avoid SSR issues
const Maps = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="h-80 sm:h-96 md:h-[400px] w-full glass-card rounded-3xl flex items-center justify-center">
      <div className="text-foreground text-sm flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        <span className="font-medium">Loading Maps...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState({
    name: "Pangkalpinang",
    adm4: "19.71.02.1001",
  });
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [rainfallData, setRainfallData] = useState<any>(null);
  // Weather data from Maps component (for sync)
  const [mapsWeatherData, setMapsWeatherData] = useState<{
    temp: string;
    condition: string;
    wind: string;
    humidity: string;
    weatherCode: number;
  } | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

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

  const locationOptions = Object.entries(MAJOR_LOCATIONS).map(([name, adm4]) => ({
    name,
    adm4,
  }));

  // Fetch real rainfall data from API based on selected location
  useEffect(() => {
    const fetchRainfallData = async () => {
      try {
        const response = await fetch(`/api/weather?adm4=${selectedLocation.adm4}`);
        const data = await response.json();

        if (data.success && data.rainfall) {
          setRainfallData({
            lastHour: {
              value: data.rainfall.value,
              intensity: data.rainfall.intensity,
            },
            daily: {
              value: (parseFloat(data.rainfall.value) * 24).toFixed(1), // Estimate daily from hourly
              intensity: data.rainfall.description,
            },
          });
          console.log("✅ Rainfall data loaded:", data.rainfall);
        } else {
          // Fallback to minimal data if API fails
          setRainfallData({
            lastHour: { value: "0", intensity: "0 mm/jam" },
            daily: { value: "0", intensity: "Tidak Hujan" },
          });
        }
      } catch (error) {
        console.error("❌ Error fetching rainfall data:", error);
        setRainfallData({
          lastHour: { value: "0", intensity: "0 mm/jam" },
          daily: { value: "0", intensity: "Tidak Hujan" },
        });
      }
    };

    fetchRainfallData();
  }, [selectedLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden flex flex-col transition-colors duration-300">
      {/* Official Header */}
      <Header />

      <div className="p-4 sm:p-6 md:p-8 md:pt-[120px] pt-[80px] sm:pt-[100px] pb-32 flex-1 flex flex-col gap-6 sm:gap-8 max-w-lg mx-auto w-full">
        {/* Location Display */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-2 pt-2">
          <div className="relative">
            <button onClick={() => setShowLocationSelector(!showLocationSelector)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium text-foreground/90">{selectedLocation.name}, Bangka Belitung</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLocationSelector ? "rotate-180" : ""}`} />
            </button>

            {/* Location Selector Dropdown */}
            {showLocationSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden z-50 min-w-48">
                {locationOptions.map((location) => (
                  <button
                    key={location.adm4}
                    onClick={() => {
                      setSelectedLocation(location);
                      setShowLocationSelector(false);
                      // Clear maps weather data so WeatherCard fetches fresh
                      setMapsWeatherData(null);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/20 transition-colors ${selectedLocation.adm4 === location.adm4 ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}>
                    {location.name}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6 sm:gap-8">
          {/* Main Weather Card */}
          <motion.div variants={itemVariants}>
            <WeatherCard useLiveData={true} adm4={selectedLocation.adm4} rainfallData={rainfallData} mapsWeatherData={mapsWeatherData} />
          </motion.div>

          {/* Hourly Forecast */}
          <motion.div variants={itemVariants}>
            <Forecast useLiveData={true} adm4={selectedLocation.adm4} />
          </motion.div>
        </motion.div>

        {/* Maps */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <Maps
            onLocationSelect={(location) => {
              setSelectedLocation({ name: location.name, adm4: location.adm4 });
              // Store weather data from Maps for sync
              if (location.weather) {
                setMapsWeatherData(location.weather);
              }
              console.log("Location selected from map:", location);
            }}
          />
        </motion.div>
      </div>

      {/* Sticky Navigation */}
      <Dock />
    </div>
  );
}
