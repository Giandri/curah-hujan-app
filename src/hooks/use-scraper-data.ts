import { useQuery } from "@tanstack/react-query";

// Interface untuk data scraper
interface ScraperData {
  timestamp: string;
  total_records: number;
  source_url: string;
  last_updated: string;
  data: any[];
}

interface ScraperApiResponse {
  success: boolean;
  message: string;
  data: ScraperData | null;
  metadata?: {
    type: string;
    label: string;
    filename: string;
    records: number;
    last_updated: string;
    source_url: string;
  };
}

interface AllScraperData {
  pos_duga_air: ScraperData | null;
  pos_curah_hujan: ScraperData | null;
  pos_klimatologi: ScraperData | null;
}

interface AllScraperApiResponse {
  success: boolean;
  message: string;
  data: AllScraperData;
}

// Hook untuk mengambil semua data scraper
export function useAllScraperData() {
  return useQuery({
    queryKey: ["scraper-data", "all"],
    queryFn: async (): Promise<AllScraperApiResponse> => {
      const response = await fetch("/api/scraper");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch scraper data");
      }

      return data;
    },
    refetchInterval: process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 10 * 60 * 1000, // 2 min dev, 10 min prod
    staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute (faster UI updates)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when connection restored
    refetchOnMount: true, // Always refetch on component mount
  });
}

// Hook untuk mengambil data scraper berdasarkan type
export function useScraperData(type: "duga-air" | "curah-hujan" | "klimatologi") {
  return useQuery({
    queryKey: ["scraper-data", type],
    queryFn: async (): Promise<ScraperApiResponse> => {
      const response = await fetch(`/api/scraper/${type}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || `Failed to fetch ${type} data`);
      }

      return data;
    },
    refetchInterval: process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 10 * 60 * 1000, // 2 min dev, 10 min prod
    staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute (faster UI updates)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: true, // Always enabled since we want to fetch data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when connection restored
  });
}

// Hook khusus untuk POS Duga Air
export function usePosDugaAirData() {
  const { data, ...rest } = useScraperData("duga-air");

  return {
    data: data?.data || null,
    metadata: data?.metadata,
    records: data?.data?.data || [],
    totalRecords: data?.data?.total_records || 0,
    lastUpdated: data?.data?.timestamp || null,
    ...rest,
  };
}

// Hook khusus untuk POS Curah Hujan
export function usePosCurahHujanData() {
  const { data, ...rest } = useScraperData("curah-hujan");

  return {
    data: data?.data || null,
    metadata: data?.metadata,
    records: data?.data?.data || [],
    totalRecords: data?.data?.total_records || 0,
    lastUpdated: data?.data?.timestamp || null,
    ...rest,
  };
}

// Hook khusus untuk POS Klimatologi
export function usePosKlimatologiData() {
  const { data, ...rest } = useScraperData("klimatologi");

  return {
    data: data?.data || null,
    metadata: data?.metadata,
    records: data?.data?.data || [],
    totalRecords: data?.data?.total_records || 0,
    lastUpdated: data?.data?.timestamp || null,
    ...rest,
  };
}

// Utility function untuk format data POS Duga Air
export function formatPosDugaAirData(rawData: any[]): any[] {
  return rawData.map((item, index) => ({
    id: index + 1,
    namaPos: item["NAMA POS"] || item["Nama Pos"] || "Unknown",
    idLogger: item["ID LOGGER"] || item["Id Logger"] || "",
    lokasi: item["LOKASI"] || item["Lokasi"] || "",
    ws: item["WS"] || item["Wilayah Sungai"] || "",
    das: item["DAS"] || item["Daerah Aliran Sungai"] || "",
    tanggal: item["TANGGAL"] || item["Tanggal"] || "",
    jam: item["JAM (WIB)"] || item["JAM"] || item["Jam"] || "",
    tma: item["TMA"] || item["tma"] || "-",
    debit: item["DEBIT"] || item["debit"] || "-",
    baterai: item["BATERAI (volt)"] || item["Baterai"] || "",
  }));
}

// Utility function untuk format data POS Curah Hujan
export function formatPosCurahHujanData(rawData: any[]): any[] {
  return rawData.map((item, index) => ({
    id: index + 1,
    namaPos: item["NAMA POS"] || item["Nama Pos"] || "Unknown",
    idLogger: item["ID LOGGER"] || item["Id Logger"] || "",
    lokasi: item["LOKASI"] || item["Lokasi"] || "",
    ws: item["WS"] || item["Wilayah Sungai"] || "",
    das: item["DAS"] || item["Daerah Aliran Sungai"] || "",
    tanggal: item["TANGGAL"] || item["Tanggal"] || "",
    jam: item["JAM"] || item["Jam"] || "",
    jamTerakhir: {
      ch: item["1 JAM TERAKHIR"] || item["Curah 1 Jam"] || "0",
      intensitas: item["INTENSITAS"] || item["Intensitas"] || "mm/jam",
    },
    akumulasiHari: {
      ch: item["BATERAI(volt)"] || item["BATERAI"] || item["Akumulasi Harian"] || "0", // BATERAI(volt) column contains accumulation data
      intensitas: item["INTENSITAS HARIAN"] || item["Intensitas Harian"] || "mm/hari",
    },
    baterai: (() => {
      // col_12 contains battery voltage data
      let batteryValue = item["col_12"] || item["BATERAI"] || item["Baterai"] || "";

      // Extract numeric value if needed
      const numericMatch = batteryValue.toString().match(/(\d+\.?\d*)/);
      return numericMatch ? numericMatch[1] : (batteryValue === "" || batteryValue === "-" ? "0" : batteryValue);
    })(),
  }));
}

// Utility function untuk format data POS Klimatologi
export function formatPosKlimatologiData(rawData: any[]): any[] {
  return rawData.map((item, index) => ({
    id: index + 1,
    namaPos: item["NAMA POS"] || item["Nama Pos"] || "Unknown",
    idLogger: item["ID LOGGER"] || item["Id Logger"] || "",
    lokasi: item["LOKASI"] || item["Lokasi"] || "",
    ws: item["WS"] || item["Wilayah Sungai"] || "",
    das: item["DAS"] || item["Daerah Aliran Sungai"] || "",
    tanggal: item["TANGGAL"] || item["Tanggal"] || "",
    jam: item["JAM"] || item["Jam"] || "",
    jamTerakhir: {
      ch: item["Suhu(°C)"] || item["SUHU"] || item["Suhu"] || "",
      intensitas: "°C",
    },
    akumulasiHari: {
      ch: (() => {
        // Extract only numeric part from "99.9%Sangat Lembab"
        const kelembapan = item["Kelembapan"] || item["KELEMBAPAN"] || "";
        const numericMatch = kelembapan.toString().match(/(\d+\.?\d*)/);
        return numericMatch ? numericMatch[1] : kelembapan;
      })(),
      intensitas: "%",
    },
    radiasi: item["Radiasi Matahari"] || item["RADIASI MATAHARI"] || "",
    arahAngin: item["Arah Angin"] || item["ARAH ANGIN"] || "",
    kecepatanAngin: item["Kecepatan Angin(km/h)"] || item["KECEPATAN ANGIN"] || "",
    tekananUdara: item["Tekanan(MB)"] || item["TEKANAN(MB)"] || "",
    curahHujan: item["Curah Hujan"] || item["CURAH HUJAN"] || "",
    tinggiPenguapan: item["Tinggi Penguapan(mm)"] || item["TINGGI PENGUAPAN"] || "",
    baterai: item["Baterai(Volt)"] || item["BATERAI(VOLT)"] || "",
  }));
}
