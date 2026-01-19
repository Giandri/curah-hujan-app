"use client";

import { Cloud, Sun, CloudRain, CloudSun, Moon, CloudLightning, CloudDrizzle, CloudFog } from "lucide-react";
import { motion } from "framer-motion";
import { ProgressiveBlur } from "@/components/magicui/progressive-blur";
import { useState, useEffect } from "react";
import { bmkgApi } from "@/lib/bmkg-api";
import { useWeatherData } from "@/hooks/use-weather";

interface ForecastProps {
  adm4?: string;
  useLiveData?: boolean;
}

export default function Forecast({ adm4 = "19.71.02.1001", useLiveData = false }: ForecastProps) {
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showHourlyView, setShowHourlyView] = useState(false);
  const [clickedCardIndex, setClickedCardIndex] = useState<number | null>(null);

  // Use React Query for data fetching
  const { data: weatherData, isLoading: isWeatherLoading } = useWeatherData(adm4, useLiveData);

  useEffect(() => {
    if (!useLiveData) {
      // Default sample data when not using live data
      const today = new Date();
      const defaultForecast = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayMonth = date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short"
        });

        const icons = [CloudSun, Sun, CloudRain, Sun, Cloud];
        const temps = ["20°", "22°", "18°", "24°", "21°"];

        defaultForecast.push({
          day: dayMonth,
          formattedDate: dayMonth,
          temp: temps[i],
          icon: icons[i],
          isActive: selectedDayIndex === i || (selectedDayIndex === null && i === 2), // Mark default active
        });
      }
      setForecastData(defaultForecast);

      // Set initial selected day for default data
      if (selectedDayIndex === null) {
        setSelectedDayIndex(2); // Default to middle day for demo
        setClickedCardIndex(2);
      }
    } else if (weatherData?.current) {
      // Build forecast starting      // Add current weather as "Hari ini" - SYNCED with WeatherCard
      const today = new Date();
      const forecastItems = [];
      const currentWeather = weatherData.current;
      // Use real hourlyData from API if available, fallback to generated
      const todayHourlyData = currentWeather.hourlyData && currentWeather.hourlyData.length > 0
        ? transformApiHourlyData(currentWeather.hourlyData)
        : generateHourlyDataForDay(currentWeather, 0);

      forecastItems.push({
        day: "Hari ini",
        formattedDate: today.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        temp: `${(Math.round(currentWeather.t * 10) / 10).toFixed(1)}°`,
        icon: getWeatherIcon(currentWeather.weather_code || 1),
        isActive: selectedDayIndex === 0 || selectedDayIndex === null,
        date: today,
        weatherCode: currentWeather.weather_code || 1,
        humidity: currentWeather.hu || 80,
        windSpeed: currentWeather.ws || 10,
        hourlyData: todayHourlyData,
      });

      // Add forecast days if available (skip index 0 if it's today, already added from current)
      if (weatherData.forecast && weatherData.forecast.length > 0) {
        // Skip first item if it's today (dayIndex === 0)
        const futureForecast = weatherData.forecast.filter((item: any) => item.dayIndex !== 0);

        futureForecast.slice(0, 4).forEach((item: any, index: number) => {
          const date = new Date(item.date || item.datetime);
          const dayMonth = date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short"
          });

          // Use real hourlyData from API if available
          const dayHourlyData = item.hourlyData && item.hourlyData.length > 0
            ? transformApiHourlyData(item.hourlyData)
            : generateHourlyDataForDay(item, index + 1);

          forecastItems.push({
            day: index === 0 ? "Besok" : dayMonth,
            formattedDate: dayMonth,
            temp: `${(Math.round(item.t * 10) / 10).toFixed(1)}°`,
            icon: getWeatherIcon(item.weather_code || 1),
            isActive: selectedDayIndex === index + 1,
            date: date,
            weatherCode: item.weather_code || 1,
            humidity: item.hu || 80,
            windSpeed: item.ws || 10,
            hourlyData: dayHourlyData,
          });
        });
      }

      setForecastData(forecastItems);
      console.log("✅ Forecast synced with WeatherCard:", {
        currentTemp: currentWeather.t,
        forecastCount: forecastItems.length,
        forecastDates: weatherData.forecast?.map((f: any) => f.date) || []
      });

      if (forecastItems[0]?.hourlyData) {
        setHourlyData(forecastItems[0].hourlyData);
      }
    } else {
      // Ultimate fallback - realistic dummy data
      console.log("⚠️ Using fallback forecast data");
      const forecastItems = generateFallbackForecast();
      setForecastData(forecastItems);
      // Set initial hourly data for today
      if (forecastItems[0]?.hourlyData) {
        setHourlyData(forecastItems[0].hourlyData);
      }
    }
  }, [weatherData, useLiveData]);

  // Initialize selected day index when forecast data loads
  useEffect(() => {
    if (selectedDayIndex === null && forecastData.length > 0) {
      const initialIndex = useLiveData ? 0 : 2; // 0 for live data, 2 for demo
      setSelectedDayIndex(initialIndex);
      setClickedCardIndex(initialIndex);
    }
  }, [forecastData, useLiveData, selectedDayIndex]);

  // Transform API hourly data to component format
  const transformApiHourlyData = (apiSlots: any[]) => {
    // Map time to period names
    const getPeriod = (hour: number): string => {
      if (hour >= 0 && hour < 6) return "Dini Hari";
      if (hour >= 6 && hour < 12) return "Pagi";
      if (hour >= 12 && hour < 18) return "Siang";
      return "Malam";
    };

    return apiSlots.map((slot: any) => {
      // Parse datetime (format: "YYYY-MM-DD HH:mm:ss")
      const timePart = slot.datetime.split(" ")[1] || "00:00:00";
      const hour = parseInt(timePart.split(":")[0]) || 0;

      return {
        hour: hour,
        time: timePart.slice(0, 5), // "HH:mm"
        period: getPeriod(hour),
        temp: Math.round(slot.t || 28),
        weatherCode: slot.weather_code || 1,
        humidity: slot.hu || 80,
        windSpeed: slot.ws || 10,
        condition: slot.weather_desc || getWeatherDescription(slot.weather_code || 1),
      };
    }).sort((a: any, b: any) => a.hour - b.hour);
  };

  // Generate 6-hourly data for a specific day (00:00, 06:00, 12:00, 18:00)
  const generateHourlyDataForDay = (dayData: any, dayIndex: number) => {
    const baseTemp = dayData.t || 28;
    const weatherCode = dayData.weather_code || 1;
    const generatedHourlyData: any[] = [];

    // Generate data for 4 time slots per day (every 6 hours)
    const timeSlots = [
      { hour: 0, label: "00:00", tempModifier: -4, period: "Dini Hari" }, // Midnight - coolest
      { hour: 6, label: "06:00", tempModifier: 2, period: "Pagi" }, // Morning - warming up
      { hour: 12, label: "12:00", tempModifier: 8, period: "Siang" }, // Noon - warm
      { hour: 18, label: "18:00", tempModifier: 4, period: "Malam" }, // Evening - cooling down
    ];

    timeSlots.forEach((slot, index) => {
      // Add some day variation based on dayIndex
      const dayVariation = dayIndex * 0.5 - 1; // Slight variation per day
      const randomVariation = (Math.random() - 0.5) * 3; // ±1.5°C randomness

      const hourlyTemp = baseTemp + slot.tempModifier + dayVariation + randomVariation;

      // Determine weather condition based on time and base weather
      let slotWeatherCode = weatherCode;
      if (slot.hour >= 6 && slot.hour <= 18) {
        // Daytime - more likely clear weather
        slotWeatherCode = Math.random() > 0.7 ? Math.min(weatherCode + 1, 3) : weatherCode;
      } else {
        // Night time - more likely cloudy or rainy
        slotWeatherCode = Math.random() > 0.6 ? Math.max(weatherCode - 1, 0) : weatherCode;
      }

      generatedHourlyData.push({
        hour: slot.hour,
        time: slot.label,
        period: slot.period,
        temp: Math.round(hourlyTemp),
        weatherCode: slotWeatherCode,
        humidity: slot.hour >= 6 && slot.hour <= 18 ? 65 + Math.random() * 20 : 75 + Math.random() * 15, // Higher humidity at night
        windSpeed: 5 + Math.random() * 8, // 5-13 km/h
        condition: getWeatherDescription(slotWeatherCode),
      });
    });

    return generatedHourlyData;
  };

  // Generate forecast based on current weather
  const generateForecastFromCurrent = (baseTemp: number, baseWeatherCode: number) => {
    const days = ["Hari ini", "Besok", "Lusa", "3 Hari", "4 Hari"];
    const forecastItems = [];

    for (let i = 0; i < 5; i++) {
      // Temperature variation based on tropical patterns
      // Day 0 (Today) must match baseTemp exactly for sync
      // Following days have some random variation
      const tempVariation = i === 0 ? 0 : (Math.random() - 0.5) * 4; // ±2°C variation for next days
      const temp = Math.round(baseTemp + tempVariation);

      // Weather code variation (tend to be similar to current)
      let weatherCode = baseWeatherCode;
      if (Math.random() > 0.7) {
        // 30% chance of different weather
        weatherCode = Math.floor(Math.random() * 4); // 0-3 range
      }

      forecastItems.push({
        day: days[i],
        formattedDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        temp: `${temp}°`,
        icon: getWeatherIcon(weatherCode),
        isActive: i === 0,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        weatherCode: weatherCode,
        humidity: 75 + Math.random() * 15, // 75-90%
        windSpeed: 8 + Math.random() * 6, // 8-14 km/h
        hourlyData: generateHourlyDataForDay({ t: temp, weather_code: weatherCode }, i),
      });
    }

    return forecastItems;
  };

  // Generate realistic fallback forecast - SYNCED with WeatherCard fallback (25°C)
  const generateFallbackForecast = () => {
    // Using same fallback temperature as WeatherCard for consistency
    const FALLBACK_TEMP = 25; // Same as WeatherCard fallbackTemp
    const FALLBACK_WEATHER_CODE = 1; // Cerah Berawan

    return generateForecastFromCurrent(FALLBACK_TEMP, FALLBACK_WEATHER_CODE);
  };

  const getWeatherIcon = (weatherCode: number) => {
    const iconMap: { [key: number]: any } = {
      // Standard BMKG codes
      0: Sun, // Cerah
      1: CloudSun, // Cerah Berawan
      2: Cloud, // Berawan
      3: Cloud, // Berawan Tebal
      4: CloudDrizzle, // Hujan Ringan -> Use CloudDrizzle
      5: CloudRain, // Hujan Sedang
      6: CloudRain, // Hujan Lebat
      7: CloudLightning, // Hujan Petir -> Use CloudLightning
      8: CloudRain, // Hujan Es
      9: CloudFog, // Kabut -> Use CloudFog
      10: CloudFog, // Asap -> Use CloudFog
      // Extended BMKG codes (API sometimes returns these)
      60: CloudDrizzle, // Hujan Ringan -> Use CloudDrizzle
      61: CloudRain, // Hujan Sedang
      63: CloudRain, // Hujan Lebat
      95: CloudLightning, // Hujan Petir -> Use CloudLightning
    };
    return iconMap[weatherCode] || CloudSun;
  };

  const getWeatherDescription = (weatherCode: number): string => {
    const descriptions: { [key: number]: string } = {
      0: "Cerah",
      1: "Cerah Berawan",
      2: "Berawan",
      3: "Berawan Tebal",
      4: "Hujan Ringan",
      5: "Hujan Sedang",
      6: "Hujan Lebat",
      7: "Hujan Petir",
      8: "Hujan Es",
      9: "Kabut",
      10: "Asap",
    };
    return descriptions[weatherCode] || "Cerah";
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close tooltip if clicking outside the chart area
      if (selectedDayIndex !== null && !target.closest("svg") && !target.closest(".hourly-view")) {
        setSelectedDayIndex(null);
      }
    };

    if (selectedDayIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [selectedDayIndex]);

  // Handle day selection for hourly view
  const handleDayClick = (index: number) => {
    if (selectedDayIndex === index && showHourlyView) {
      // If same day clicked and hourly view is open, close it
      setShowHourlyView(false);
      setSelectedDayIndex(null);
      setClickedCardIndex(null);
    } else {
      // Open hourly view for selected day
      setSelectedDayIndex(index);
      setClickedCardIndex(index);
      setShowHourlyView(true);
      // Set hourly data for selected day
      if (forecastData[index]?.hourlyData) {
        setHourlyData(forecastData[index].hourlyData);
      }
    }

    // Update isActive state for all forecast cards
    setForecastData(prevData =>
      prevData.map((item, i) => ({
        ...item,
        isActive: i === index
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Forecast Cards - Horizontal scroll like Dribbble design */}
      <div className="relative">
        {/* Left Blur */}
        <ProgressiveBlur direction="left" className="w-12 z-20" />
        {/* Right Blur */}
        <ProgressiveBlur direction="right" className="w-12 z-20" />

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide relative z-10 px-2 sm:px-0 group">
          {forecastData.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  shrink-0 flex flex-col items-center gap-3 p-4 rounded-3xl min-w-[70px] transition-all cursor-pointer
                  ${item.isActive ? "bg-foreground border border-foreground/20" : "bg-muted/50 hover:bg-muted hover:scale-105"}
                `}
                onClick={() => handleDayClick(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                <div className="flex flex-col items-center gap-0.5">
                  <span className={`text-sm transition-colors ${item.isActive ? "text-background" : "text-foreground"}`}>{item.day}</span>
                  <span className={`text-[10px] font-medium ${item.isActive ? "text-background/70" : "text-muted-foreground"}`}>{item.formattedDate}</span>
                </div>
                <div className={`p-2 rounded-xl transition-colors ${item.isActive ? "bg-background/10" : "bg-muted"}`}>
                  <IconComponent
                    className={`h-8 w-8 transition-colors ${item.icon === Sun || item.icon === CloudSun ? "text-yellow-400" : item.icon === CloudRain ? "text-blue-400" : item.isActive ? "text-background" : "text-muted-foreground"}`}
                  />
                </div>
                <span className={`text-lg font-semibold z-50 transition-colors ${item.isActive ? "text-background" : "text-foreground"}`}>{item.temp}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Temperature Trend */}
      <div className="glass-card-dark rounded-3xl p-4 mt-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <h3 className="text-sm text-foreground mb-4">
            Suhu Per Jam - {forecastData[selectedDayIndex ?? 0]?.day || "Hari ini"}
          </h3>
          <div className="h-28 relative mt-6 mb-2">
            {isWeatherLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
              </div>
            ) : (
              <svg viewBox="0 0 280 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Glow filter */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Chart with hourly temperature data for selected day */}
                {(() => {
                  const selectedDay = forecastData[selectedDayIndex ?? 0];
                  const hourlyData = selectedDay?.hourlyData || [];

                  if (hourlyData.length === 0) return null;

                  // Get temperature from hourly data
                  const getTemp = (item: any) => typeof item.temp === 'string' ? parseFloat(item.temp.replace("°", "")) : (item.t || item.temp || 28);

                  const temps = hourlyData.map(getTemp);
                  const minTemp = Math.min(...temps);
                  const maxTemp = Math.max(...temps);
                  const tempRange = Math.max(maxTemp - minTemp, 5);

                  const CHART_HEIGHT = 50;
                  const Y_BOTTOM = 65;

                  const getY = (temp: number) => {
                    const normalized = (temp - minTemp) / tempRange;
                    return Y_BOTTOM - (normalized * CHART_HEIGHT);
                  };

                  const points = hourlyData.map((item: any, index: number) => {
                    const x = hourlyData.length > 1 ? (index / (hourlyData.length - 1)) * 280 : 140;
                    const y = getY(getTemp(item));
                    return { x, y, temp: getTemp(item), time: item.time || `${(index * 3).toString().padStart(2, '0')}:00` };
                  });

                  let pathD = `M ${points[0].x},${points[0].y}`;
                  for (let i = 1; i < points.length; i++) {
                    const curr = points[i];
                    const prev = points[i - 1];
                    const midX = (prev.x + curr.x) / 2;
                    pathD += ` Q ${midX},${prev.y} ${curr.x},${curr.y}`;
                  }

                  return (
                    <>
                      <motion.path
                        key={`path-${selectedDayIndex}`}
                        d={pathD}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        filter="url(#glow)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />

                      {points.map((point: any, index: number) => (
                        <g key={`point-${selectedDayIndex}-${index}`}>
                          <motion.circle
                            cx={point.x} cy={point.y} r="3"
                            fill="#ffffff"
                            stroke="currentColor" strokeWidth="1.5"
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                          />
                          <motion.text
                            x={point.x} y={point.y - 10}
                            textAnchor="middle"
                            fill="currentColor"
                            fontSize="9" fontWeight="bold"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 + index * 0.05 }}
                          >
                            {point.temp.toFixed(0)}°
                          </motion.text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
          {/* Time labels for hourly data */}
          <div className="flex justify-between mt-4 pt-2 border-t border-foreground/10 overflow-x-auto">
            {(() => {
              const selectedDay = forecastData[selectedDayIndex ?? 0];
              const hourlyData = selectedDay?.hourlyData || [];
              return hourlyData.map((item: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[35px]">
                  <span className="text-[10px] text-muted-foreground">{item.time || `${(i * 3).toString().padStart(2, '0')}:00`}</span>
                </div>
              ));
            })()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper function to generate SVG path for temperature trend
function generateTemperaturePath(forecastData: any[]): string {
  if (forecastData.length === 0) return "M 0,50 L 280,50";

  let path = "";
  const width = 280;
  const height = 70;

  forecastData.forEach((item, index) => {
    const x = (index / (forecastData.length - 1)) * width;

    // Extract temperature value from string (e.g., "28°" -> 28)
    const tempStr = item.temp || "25°";
    const temp = parseInt(tempStr.replace("°", "")) || 25;

    // Scale temperature: 15°C = bottom (y=70), 40°C = top (y=20)
    const y = height - ((temp - 15) / 25) * 50;

    if (index === 0) {
      path += `M ${x},${y}`;
    } else {
      // Create smooth curve using quadratic Bézier
      const prevX = ((index - 1) / (forecastData.length - 1)) * width;
      const prevTempStr = forecastData[index - 1].temp || "25°";
      const prevTemp = parseInt(prevTempStr.replace("°", "")) || 25;
      const prevY = height - ((prevTemp - 15) / 25) * 50;

      const midX = (prevX + x) / 2;
      path += ` Q ${midX},${prevY} ${x},${y}`;
    }
  });

  return path;
}

// Helper function to generate SVG path for 6-hourly temperature (4 points)
function generateHourlyTemperaturePath(hourlyData: any[]): string {
  if (hourlyData.length === 0) return "M 0,50 L 320,50";

  let path = "";
  const width = 320;
  const height = 70;

  hourlyData.forEach((hour, index) => {
    const x = (index / 3) * width; // 4 points (0-3) distributed across width
    const temp = hour.temp || 25;

    // Scale temperature: 20°C = bottom (y=70), 40°C = top (y=20)
    const y = height - ((temp - 20) / 20) * 50;

    if (index === 0) {
      path += `M ${x},${y}`;
    } else {
      // Create smooth curve
      const prevX = ((index - 1) / 3) * width;
      const prevTemp = hourlyData[index - 1].temp || 25;
      const prevY = height - ((prevTemp - 20) / 20) * 50;

      const midX = (prevX + x) / 2;
      path += ` Q ${midX},${prevY} ${x},${y}`;
    }
  });

  return path;
}
