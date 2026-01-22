// hooks/useWeatherData.ts
import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { bmkgApi, BMKGWeatherData } from "@/lib/bmkg-api";

// Type untuk current weather (cuaca saat ini + info lokasi)
export interface CurrentWeatherData {
  location: {
    adm4: string;
    provinsi: string;
    kota: string;
    kecamatan: string;
    lat: number;
    lon: number;
  };
  current: {
    datetime: string;
    t: number;
    temp?: string;
    tcc: number;
    tp: number;
    wd: number;
    ws: number;
    hu: number;
    weather_desc: string;
    weather_code: number;
    image: string;
    hourlyData?: any[];
  };
  forecast: Array<{
    datetime: string;
    t: number;
    temp?: string;
    tcc: number;
    tp: number;
    wd: number;
    ws: number;
    hu: number;
    weather_desc: string;
    weather_code: number;
    image: string;
    hourlyData?: any[];
  }>;
  rainfallData?: {
    lastHour: { value: string; intensity: string };
    daily: { value: string; intensity: string };
  } | null;
}

/**
 * Hook untuk mendapatkan data cuaca lengkap (current + forecast)
 * @param adm4 - Kode wilayah ADM4 (contoh: "19.71.01.1001")
 * @param enabled - Enable/disable query
 */
export function useWeatherData(adm4: string, enabled: boolean = true): UseQueryResult<CurrentWeatherData | null, Error> {
  return useQuery({
    queryKey: ["weather", adm4],
    queryFn: async (): Promise<CurrentWeatherData | null> => {
      console.log(`🔍 Fetching weather data for ADM4: ${adm4}`);

      try {
        // Fetch ke Internal API Route (Server-Side Proxy)
        // Ini menghindari CORS issues dan memanfaatkan caching server
        const response = await fetch(`/api/weather?adm4=${adm4}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.current) {
          console.warn("⚠️ No weather data received from API");
          return null;
        }

        console.log(`✅ Weather data fetched via Server Proxy:`, {
          location: data.location.kota,
          currentTemp: data.current.t,
          forecastCount: data.forecast.length,
        });

        // Data dari API sudah dalam format Clean JSON yang sesuai dengan CurrentWeatherData
        return data as CurrentWeatherData;

      } catch (error: any) {
        console.error("❌ Error fetching weather:", error.message);
        throw new Error(`Failed to fetch weather data: ${error.message}`);
      }
    },
    enabled: enabled && !!adm4, // Only run if enabled and adm4 is provided
    staleTime: 60 * 1000, // Data dianggap fresh selama 1 menit
    gcTime: 15 * 60 * 1000, // Cache data selama 15 menit
    refetchOnWindowFocus: false, // Jangan refetch saat window focus
    refetchInterval: 60 * 1000, // Auto refetch setiap 1 menit
    retry: (failureCount, error) => {
      // Retry max 3x dengan exponential backoff
      if (failureCount >= 3) {
        console.log("❌ Max retry reached, giving up");
        return false;
      }
      console.log(`🔄 Retry attempt ${failureCount + 1}/3`);
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
  });
}

/**
 * Hook untuk mendapatkan hanya data forecast (tanpa current)
 * @param adm4 - Kode wilayah ADM4
 * @param enabled - Enable/disable query
 * @param days - Jumlah hari forecast yang diinginkan (default: 5)
 */
export function useWeatherForecast(adm4: string, enabled: boolean = true, days: number = 5): UseQueryResult<CurrentWeatherData["forecast"], Error> {
  return useQuery({
    queryKey: ["weather-forecast", adm4, days],
    queryFn: async () => {
      console.log(`🔍 Fetching forecast for ADM4: ${adm4} (${days} days)`);

      try {
        const weatherData = await bmkgApi.getWeatherForecast(adm4);

        if (!weatherData || !weatherData.cuaca || weatherData.cuaca.length === 0) {
          console.warn("⚠️ No forecast data available");
          return [];
        }

        // Skip current weather (index 0), ambil sisanya sebagai forecast
        const forecast = weatherData.cuaca.slice(1, days + 1);

        console.log(`✅ Forecast fetched: ${forecast.length} days`);

        return forecast;
      } catch (error: any) {
        console.error("❌ Error fetching forecast:", error.message);
        throw new Error(`Failed to fetch forecast: ${error.message}`);
      }
    },
    enabled: enabled && !!adm4,
    staleTime: 60 * 1000, // Data fresh selama 1 menit
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000, // Auto refetch setiap 1 menit
    retry: 2, // Retry max 2x untuk forecast
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook untuk mendapatkan hanya current weather (tanpa forecast)
 * Lebih lightweight jika hanya butuh data saat ini
 */
export function useCurrentWeather(adm4: string, enabled: boolean = true): UseQueryResult<CurrentWeatherData["current"] | null, Error> {
  return useQuery({
    queryKey: ["current-weather", adm4],
    queryFn: async () => {
      console.log(`🔍 Fetching current weather for ADM4: ${adm4}`);

      try {
        const weatherData = await bmkgApi.getWeatherForecast(adm4);

        if (!weatherData || !weatherData.cuaca || weatherData.cuaca.length === 0) {
          console.warn("⚠️ No current weather data available");
          return null;
        }

        // Ambil hanya data cuaca saat ini (index 0)
        const current = weatherData.cuaca[0];

        console.log(`✅ Current weather:`, {
          temp: current.t,
          weather: current.weather_desc,
        });

        return current;
      } catch (error: any) {
        console.error("❌ Error fetching current weather:", error.message);
        throw new Error(`Failed to fetch current weather: ${error.message}`);
      }
    },
    enabled: enabled && !!adm4,
    staleTime: 60 * 1000, // Fresh selama 1 menit
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000, // Refetch setiap 1 menit
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}


export function useMultipleLocationsWeather(adm4List: string[], enabled: boolean = true): UseQueryResult<Map<string, CurrentWeatherData["current"]>, Error> {
  return useQuery({
    queryKey: ["multiple-weather", ...adm4List.sort()],
    queryFn: async () => {
      console.log(`🔍 Fetching weather for ${adm4List.length} locations`);

      const weatherMap = new Map<string, CurrentWeatherData["current"]>();

      try {
        // Fetch all locations in parallel
        const promises = adm4List.map(async (adm4) => {
          const data = await bmkgApi.getWeatherForecast(adm4);
          if (data && data.cuaca && data.cuaca.length > 0) {
            return { adm4, weather: data.cuaca[0] };
          }
          return null;
        });

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            weatherMap.set(result.value.adm4, result.value.weather);
          }
        });

        console.log(`✅ Fetched weather for ${weatherMap.size}/${adm4List.length} locations`);

        return weatherMap;
      } catch (error: any) {
        console.error("❌ Error fetching multiple locations:", error.message);
        throw error;
      }
    },
    enabled: enabled && adm4List.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook untuk prefetch weather data
 * Berguna untuk preload data sebelum user navigasi
 */
export function usePrefetchWeather() {
  const queryClient = useQueryClient();

  const prefetchWeather = async (adm4: string) => {
    await queryClient.prefetchQuery({
      queryKey: ["weather", adm4],
      queryFn: async () => {
        const weatherData = await bmkgApi.getWeatherForecast(adm4);
        if (!weatherData || !weatherData.cuaca || weatherData.cuaca.length === 0) {
          return null;
        }
        const [current, ...forecast] = weatherData.cuaca;
        return {
          location: weatherData.lokasi,
          current,
          forecast: forecast.slice(0, 7),
        };
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchWeather };
}

export type { BMKGWeatherData } from "@/lib/bmkg-api";
