"use strict";
"use client";

import React from "react";
import Header from "@/components/Header";
import Dock from "@/components/Dock";
import { CloudRain, Waves, Thermometer, Droplets, Search, Filter, MoreHorizontal, ArrowUpRight, MapPin, LayoutGrid as LayoutGridIcon, LucideIcon, Eye, EyeOff, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePosDugaAirData, usePosCurahHujanData, usePosKlimatologiData, formatPosDugaAirData, formatPosCurahHujanData, formatPosKlimatologiData } from "@/hooks/use-scraper-data";

const summaryData = [
  {
    title: "Pos Curah Hujan",
    value: "13",
    unit: "Lokasi",
    icon: CloudRain,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  },
  {
    title: "Pos Duga Air",
    value: "8",
    unit: "Lokasi",
    icon: Waves,
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
  },
  {
    title: "Pos Klimatologi",
    value: "5",
    unit: "Lokasi",
    icon: Thermometer,
    color: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  },
];

interface DataRow {
  id: number;
  namaPos: string;
  idLogger?: string;
  lokasi?: string;
  ws?: string;
  das?: string;
  tanggal: string;
  jam: string;
  baterai: string;
  tma?: string;
  debit?: string;
  jamTerakhir?: { ch: string; intensitas: string };
  akumulasiHari?: { ch: string; intensitas: string };
  radiasi?: string;
  arahAngin?: string;
  kecepatanAngin?: string;
  tekananUdara?: string;
  curahHujan?: string;
  tinggiPenguapan?: string;
  location?: string;
  type?: string;
  value?: string;
  unit?: string;
  status?: string;
  statusColor?: string;
  time?: string;
  // Klimatologi-specific fields
  kelembapan?: string;
  kelembapanStatus?: string;
  curahHujanPer5Menit?: string;
  curahHujan1JamTerakhir?: string;
  curahHujanStatus?: string;
  tekanan?: string;
  radiasiMatahari?: string;
  lamaPenyinaran?: string;
  suhu?: string;
}

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("awas") || s.includes("sangat lebat") || s.includes("bahaya")) return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
  if (s.includes("siaga") || s.includes("waspada") || s.includes("lebat") || s.includes("peringatan")) return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400";
  if (s.includes("sedang") || s.includes("kering")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
  if (s.includes("ringan") || s.includes("lembab")) return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
  if (s.includes("tidak hujan") || s.includes("normal")) return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
  return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400";
};

// Fungsi untuk mengkonversi intensitas numerik ke keterangan deskriptif
const getRainIntensityDescription = (intensity: string) => {
  if (!intensity) return "Tidak ada data";

  // Clean up the intensity string
  const cleanIntensity = intensity.toLowerCase().trim();

  // Map intensitas ke keterangan
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

  return intensity; // Return original if no match
};

// Data akan diambil dari scraper secara real-time
// Hook untuk data scraper
function useScraperDataForTables() {
  const queryClient = useQueryClient();
  const dugaAirQuery = usePosDugaAirData();
  const curahHujanQuery = usePosCurahHujanData();
  const klimatologiQuery = usePosKlimatologiData();

  // Format data POS Duga Air
  const posDugaAirData =
    dugaAirQuery.records.length > 0
      ? formatPosDugaAirData(dugaAirQuery.records).map((item) => ({
        ...item,
        status: item.tma === "-" ? "Tanpa Status" : "Normal",
        statusColor: getStatusColor(item.tma === "-" ? "Tanpa Status" : "Normal"),
      }))
      : [];

  // Format data POS Curah Hujan
  const posCurahHujanData =
    curahHujanQuery.records.length > 0
      ? formatPosCurahHujanData(curahHujanQuery.records).map((item) => {
        const status =
          item.jamTerakhir?.ch === "0"
            ? "Tidak Hujan"
            : parseFloat(item.jamTerakhir?.ch || "0") >= 20
              ? "Hujan Sangat Lebat"
              : parseFloat(item.jamTerakhir?.ch || "0") >= 10
                ? "Hujan Lebat"
                : parseFloat(item.jamTerakhir?.ch || "0") >= 5
                  ? "Hujan Sedang"
                  : "Hujan Ringan";
        return { ...item, status, statusColor: getStatusColor(status) };
      })
      : [];

  const posKlimatologiData =
    klimatologiQuery.records.length > 0
      ? formatPosKlimatologiData(klimatologiQuery.records).map((item) => {
        let status = "Normal";
        const suhu = parseFloat(item.jamTerakhir?.ch || "0");
        const kelembapan = parseFloat(item.akumulasiHari?.ch || "0");

        if (suhu > 35 || suhu < 15) status = "Peringatan Suhu";
        else if (kelembapan < 30) status = "Udara Kering";
        else if (kelembapan > 90) status = "Udara Lembab";

        return {
          ...item,
          status,
          statusColor: getStatusColor(status),
        };
      })
      : [];

  return {
    posDugaAirData,
    posCurahHujanData,
    posKlimatologiData,
    loading: dugaAirQuery.isLoading || curahHujanQuery.isLoading || klimatologiQuery.isLoading,
    error: dugaAirQuery.error || curahHujanQuery.error || klimatologiQuery.error,
    lastUpdated: Math.max(
      dugaAirQuery.lastUpdated ? new Date(dugaAirQuery.lastUpdated).getTime() : 0,
      curahHujanQuery.lastUpdated ? new Date(curahHujanQuery.lastUpdated).getTime() : 0,
      klimatologiQuery.lastUpdated ? new Date(klimatologiQuery.lastUpdated).getTime() : 0
    ),
    refetch: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["scraper-data"],
        refetchType: "active",
      });
    },
  };
}


const TableCard = React.memo(
  ({
    title,
    icon: Icon,
    data,
    colorClass,
    iconBgClass,
    loading = false,
    emptyMessage = "Tidak ada data tersedia",
  }: {
    title: string;
    icon: LucideIcon;
    data: DataRow[];
    colorClass: string;
    iconBgClass: string;
    loading?: boolean;
    emptyMessage?: string;
  }) => {
    // Determine table type based on data structure
    const isPosDugaAir = data[0]?.tma !== undefined;
    const isPosCurahHujan = data[0]?.jamTerakhir !== undefined && data[0]?.akumulasiHari !== undefined && !data[0]?.namaPos?.toLowerCase().includes("klimatologi");
    const isPosKlimatologi = data[0]?.namaPos?.toLowerCase().includes("klimatologi") || title.toLowerCase().includes("klimatologi");

    return (
      <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-[#FFD700] dark:border-gray-700 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFD700] dark:border-gray-700 bg-[#FFD700] dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${iconBgClass}`}>
                <Icon className={`h-5 w-5 ${colorClass}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-yellow-500 dark:text-gray-400">{data.length} lokasi aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-[#FFD700] dark:hover:bg-gray-700 text-yellow-600 dark:text-gray-400 transition-colors">
                <LayoutGridIcon className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-yellow-500 dark:text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Memuat data...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && data.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 dark:text-yellow-500 mx-auto mb-4" />
              <p className="text-yellow-500 dark:text-gray-400">{emptyMessage}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && data.length > 0 && (
          <>
            {isPosKlimatologi ? (
              /* Klimatologi Table with Custom Structure */
              <div className="overflow-x-auto rounded-lg border border-[#FFD700] dark:border-gray-700">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-[#FFD700] dark:bg-yellow-900/50">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        No
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-left whitespace-nowrap text-black dark:text-gray-200">
                        Nama Pos
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Tanggal
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Jam
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Kelembapan
                      </th>
                      <th colSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Curah Hujan
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Tekanan
                        <div className="text-xs text-yellow-500">(MB)</div>
                      </th>
                      <th colSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Radiasi Matahari
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Suhu
                        <div className="text-xs text-yellow-500">(°C)</div>
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Arah Angin
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Kecepatan Angin
                        <div className="text-xs text-yellow-500">(km/h)</div>
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Penguapan
                        <div className="text-xs text-yellow-500">(mm)</div>
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-black dark:text-gray-200">
                        Baterai
                        <div className="text-xs text-yellow-500">(Volt)</div>
                      </th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-xs text-black dark:text-gray-200">Per 5 Menit</th>
                      <th className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-xs text-black dark:text-gray-200">1 Jam Terakhir</th>
                      <th className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-xs text-black dark:text-gray-200">W/m²</th>
                      <th className="px-3 py-2 border border-[#FFD700] dark:border-gray-700 text-center text-xs text-black dark:text-gray-200">Jam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FFD700] dark:divide-gray-700">
                    {data.map((row, idx) => (
                      <tr key={row.id} className="group hover:bg-[#FFD700] dark:hover:bg-yellow-500/10 transition-colors cursor-pointer">
                        {/* No. */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFD700] dark:bg-gray-700 text-xs font-medium text-yellow-600 dark:text-gray-300">{(idx + 1).toString().padStart(2, "0")}</span>
                        </td>
                        {/* Nama Pos */}
                        <td className="px-3 py-3 min-w-48 border border-[#FFD700] dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              <div className="h-8 w-8 rounded-full bg-linear-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-700 flex items-center justify-center">
                                <Thermometer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white whitespace-normal leading-tight">{row.namaPos}</div>
                            </div>
                          </div>
                        </td>
                        {/* Tanggal */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.tanggal || "-"}
                        </td>
                        {/* Jam */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white border border-[#FFD700] dark:border-gray-700">
                          {row.jam || "-"}
                        </td>
                        {/* Kelembapan */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{row.kelembapan || "-"}%</div>
                          <div className="text-xs text-yellow-500 dark:text-gray-400">{row.kelembapanStatus || ""}</div>
                        </td>
                        {/* Curah Hujan Per 5 Menit */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.curahHujanPer5Menit || "-"}
                        </td>
                        {/* Curah Hujan 1 Jam Terakhir */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{row.curahHujan1JamTerakhir || "-"} mm</div>
                          <div className="text-xs text-yellow-500 dark:text-gray-400">{row.curahHujanStatus || ""}</div>
                        </td>
                        {/* Tekanan */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.tekanan || "-"}
                        </td>
                        {/* Radiasi Matahari */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.radiasiMatahari || "-"}
                        </td>
                        {/* Lama Penyinaran */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.lamaPenyinaran || "-"}
                        </td>
                        {/* Suhu */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{row.suhu || "-"}</span>
                        </td>
                        {/* Arah Angin with directional arrow */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          {(() => {
                            const arah = row.arahAngin || "-";
                            if (arah === "-") return <span className="text-sm text-gray-400">-</span>;

                            // Extract direction text from "206° Barat Daya" format
                            const dirMatch = arah.match(/(\d+)°?\s*(.*)/);
                            const degrees = dirMatch ? parseInt(dirMatch[1]) : 0;
                            const dirText = dirMatch ? dirMatch[2].trim() : "";

                            // Map direction text to rotation angle (arrow points TO that direction)
                            const getRotation = (text: string): number => {
                              const t = text.toLowerCase();
                              if (t.includes("utara") && t.includes("timur")) return 45;
                              if (t.includes("utara") && t.includes("barat")) return 315;
                              if (t.includes("selatan") && t.includes("timur") || t.includes("tenggara")) return 135;
                              if (t.includes("selatan") && t.includes("barat") || t.includes("barat daya")) return 225;
                              if (t.includes("timur") && t.includes("laut")) return 45;
                              if (t.includes("barat") && t.includes("laut")) return 315;
                              if (t.includes("utara")) return 0;
                              if (t.includes("timur")) return 90;
                              if (t.includes("selatan")) return 180;
                              if (t.includes("barat")) return 270;
                              return degrees; // fallback to actual degrees
                            };

                            const rotation = getRotation(dirText);

                            return (
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{degrees}°</div>
                                <div
                                  className="w-5 h-5 flex items-center justify-center"
                                  style={{ transform: `rotate(${rotation}deg)` }}
                                >
                                  <svg
                                    className="w-4 h-4 text-blue-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                                  </svg>
                                </div>
                                <div className="text-xs text-yellow-500 dark:text-gray-400">{dirText}</div>
                              </div>
                            );
                          })()}
                        </td>
                        {/* Kecepatan Angin */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.kecepatanAngin || "-"}
                        </td>
                        {/* Tinggi Penguapan */}
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-gray-300 border border-[#FFD700] dark:border-gray-700">
                          {row.tinggiPenguapan || "-"}
                        </td>
                        {/* Baterai */}
                        <td className="px-3 py-3 whitespace-nowrap text-center border border-[#FFD700] dark:border-gray-700">
                          <div className="flex items-center justify-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${parseFloat(row.baterai || "0") >= 12.5 ? "bg-green-400" : parseFloat(row.baterai || "0") >= 12.0 ? "bg-yellow-400" : "bg-red-400"}`}></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{row.baterai && row.baterai !== "0" ? `${row.baterai}V` : "N/A"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Regular Table for Other POS Types */
              <div className="overflow-x-auto rounded-lg border border-[#FFD700] dark:border-gray-700">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-[#FFD700] dark:bg-yellow-900/50">
                    <tr>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider w-12">#</th>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-56">Pos & ID</th>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-32">Lokasi</th>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-20">WS</th>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-24">DAS</th>
                      <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-20">Waktu</th>
                      {isPosDugaAir && (
                        <>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-16">TMA</th>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-16">Debit</th>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-16">Jam</th>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-left text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-16">Status</th>
                        </>
                      )}
                      {isPosCurahHujan && (
                        <>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-20">
                            <div>1 Jam Terakhir</div>
                            <div className="text-[8px] font-normal">CH (mm)</div>
                          </th>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-20">
                            <div>Akumulasi 1 Hari</div>
                            <div className="text-[8px] font-normal">CH (mm)</div>
                          </th>
                          <th className="px-3 py-3 border border-[#FFD700] dark:border-gray-700 text-center text-xs font-semibold text-black dark:text-gray-200 uppercase tracking-wider min-w-16">
                            <div>Baterai</div>
                            <div className="text-[8px] font-normal">(volt)</div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FFD700] dark:divide-gray-700">
                    {data.map((row, idx) => (
                      <tr key={row.id} className="group hover:bg-[#FFD700]/20 dark:hover:bg-yellow-500/10 transition-colors cursor-pointer">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFD700] dark:bg-gray-700 text-xs font-medium text-black dark:text-gray-300">{(idx + 1).toString().padStart(2, "0")}</span>
                        </td>
                        <td className="px-3 py-3 min-w-56">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white" title={row.namaPos || row.location}>
                                <div className="whitespace-normal wrap-break-word leading-tight">{row.namaPos || row.location}</div>
                              </div>
                              <div className="text-xs text-yellow-500 dark:text-gray-400 font-mono">{row.idLogger}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white font-medium min-w-32" title={row.lokasi}>
                          <div className="whitespace-normal wrap-break-word leading-tight">{row.lokasi}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-yellow-600 dark:text-gray-300 min-w-20" title={row.ws}>
                          <div className="whitespace-normal wrap-break-word leading-tight">{row.ws}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-yellow-600 dark:text-gray-300 min-w-24" title={row.das}>
                          <div className="whitespace-normal wrap-break-word leading-tight">{row.das}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-yellow-600 dark:text-gray-300 min-w-16">
                          <div>{row.tanggal}</div>
                          <div className="font-medium text-gray-900 dark:text-white">{row.jam}</div>
                        </td>
                        {isPosDugaAir && (
                          <>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{row.tma}</span>
                                <span className="text-xs text-yellow-500 dark:text-gray-400">m</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{row.debit}</span>
                                <span className="text-xs text-yellow-500 dark:text-gray-400">m³/s</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{row.jam || "-"}</span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.status === "Normal" ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                                  }`}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        )}
                        {isPosCurahHujan && (
                          <>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {row.jamTerakhir?.ch || "0"}
                                <span className="text-xs font-normal text-yellow-500 dark:text-gray-400 ml-0.5">mm</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {row.akumulasiHari?.ch || "0"}
                                <span className="text-xs font-normal text-yellow-500 dark:text-gray-400 ml-0.5">mm</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${parseFloat(row.baterai || "0") >= 12.5 ? "bg-green-400" : parseFloat(row.baterai || "0") >= 12.0 ? "bg-yellow-400" : "bg-red-400"}`}></div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{row.baterai && row.baterai !== "0" ? `${row.baterai}V` : "N/A"}</span>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="px-3 py-3 bg-[#FFD700]/10 dark:bg-gray-800/50 border-t border-[#FFD700] dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#FFD700] dark:text-gray-400">
              Menampilkan {data.length} dari {data.length} lokasi
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#FFD700] hover:text-yellow-800 dark:text-[#FFD700] dark:hover:text-yellow-300 hover:bg-[#FFD700]/20 dark:hover:bg-yellow-500/10 rounded-lg transition-colors">
              Lihat Semua
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default function DataPage() {
  const [activeTable, setActiveTable] = useState<"duga-air" | "curah-hujan" | "all">("duga-air");
  const [autoScraping, setAutoScraping] = useState(false);
  const [lastAutoRefresh, setLastAutoRefresh] = useState<Date | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const queryClient = useQueryClient();

  // Menggunakan hook scraper untuk data real-time
  const { posDugaAirData, posCurahHujanData, posKlimatologiData, loading, error, lastUpdated, refetch } = useScraperDataForTables();

  // Auto-scraping trigger ketika halaman Data dibuka
  useEffect(() => {
    const triggerScraping = async () => {
      try {
        setAutoScraping(true);
        console.log("🔄 Auto-triggering scraper on Data page load...");

        const response = await fetch("/api/scraper/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "run-now" }),
        });

        const result = await response.json();

        if (result.success) {
          console.log("✅ Auto-scraping triggered successfully:", result.message);
          // Invalidate queries immediately after scraping completes for faster UI updates
          console.log("🔄 Invalidating React Query cache after scraping completion...");
          await queryClient.invalidateQueries({
            queryKey: ["scraper-data"],
            refetchType: "active", // Force immediate refetch for all active queries
          });
          console.log("✅ React Query cache invalidated - UI should update now");
          setAutoScraping(false);
          setLastAutoRefresh(new Date());
        } else {
          console.error("❌ Auto-scraping failed:", result.error);
          setAutoScraping(false);
        }
      } catch (error) {
        console.error("❌ Failed to trigger auto-scraping:", error);
        setAutoScraping(false);
      }
    };

    // Trigger scraping saat halaman pertama kali dimuat
    triggerScraping();
  }, []); // Empty dependency array = hanya sekali saat mount

  // Track auto-refresh dari React Query
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setIsAutoRefreshing(true);
        setTimeout(() => setIsAutoRefreshing(false), 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Listen for React Query cache updates - optimized for table-only refresh
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.queryKey[0] === "scraper-data") {
        console.log("🔄 React Query cache updated for scraper data - table refresh only");
        setLastAutoRefresh(new Date());
        setIsAutoRefreshing(true);
        // Shorter feedback duration for smoother UX
        setTimeout(() => setIsAutoRefreshing(false), 1000);
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Force refresh UI when data changes (additional safety mechanism)
  useEffect(() => {
    if (lastUpdated > 0) {
      console.log("📅 UI lastUpdated changed to:", new Date(lastUpdated).toLocaleString("id-ID"));
    }
  }, [lastUpdated]);

  const getTableOffset = (table: string) => {
    switch (table) {
      case "duga-air":
        return "-280px"; // POS DUGA AIR - crop tepat pada tabel data saja
      case "curah-hujan":
        return "-580px"; // POS CURAH HUJAN - crop tepat pada tabel data saja
      case "all":
        return "-220px"; // Semua tabel dari awal
      default:
        return "-280px";
    }
  };

  const getTableHeight = (table: string) => {
    switch (table) {
      case "duga-air":
        return "380px"; // Hanya tabel data POS DUGA AIR (lebih kecil karena crop lebih tepat)
      case "curah-hujan":
        return "380px"; // Hanya tabel data POS CURAH HUJAN (lebih kecil karena crop lebih tepat)
      case "all":
        return "900px"; // Semua tabel dengan space yang cukup
      default:
        return "380px";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 transition-colors duration-300">
      <Header />

      <main className="container mx-auto pt-24 px-4 sm:px-6 max-w-7xl space-y-12">
        {/* Header Section with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Monitoring</h1>
            <p className="text-muted-foreground mt-1">Ringkasan data hidrologi terkini dari seluruh pos pengamatan.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari lokasi..."
                className="pl-9 pr-4 py-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 w-full sm:w-64 shadow-sm placeholder:text-muted-foreground"
              />
            </div>
            <button className="p-2 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Auto-Scraping Status & Manual Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setAutoScraping(true);
              try {
                const response = await fetch("/api/scraper/trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "run-now" }),
                });
                const result = await response.json();
                if (result.success) {
                  // Invalidate specific queries instead of global refetch
                  await queryClient.invalidateQueries({
                    queryKey: ["scraper-data"],
                    refetchType: "active", // Force immediate refetch for all active queries
                  });
                  setAutoScraping(false);
                  setLastAutoRefresh(new Date());
                } else {
                  setAutoScraping(false);
                }
              } catch (error) {
                console.error("❌ Manual refresh failed:", error);
                setAutoScraping(false);
              }
            }}
            disabled={autoScraping}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFD700] hover:bg-yellow-400 disabled:bg-[#FFD700] text-black rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed">
            <RefreshCw className={`h-4 w-4 ${autoScraping ? "animate-spin" : ""}`} />
            <span>{autoScraping ? "Mengambil Data..." : "Refresh Data"}</span>
          </button>
        </div>

        {/* Stats Cards - Horizontal Scroll on Mobile */}
        <div className="glass-card dark:glass-card-dark p-6 rounded-[2.5rem] overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-lg font-semibold text-foreground">Kategori Pos</h2>
            <div className="flex gap-2">
              <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
            {summaryData.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center justify-center p-4 rounded-4xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <span className="text-sm font-medium text-muted-foreground mb-1">{item.title}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground">{item.unit}</span>
                </div>
              </motion.div>
            ))}
          </div>
          {lastUpdated > 0 && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Terakhir diperbarui:{" "}
              {(() => {
                const date = new Date(lastUpdated);
                const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const day = days[date.getDay()];
                const dateNum = date.getDate();
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, "0");
                const minutes = date.getMinutes().toString().padStart(2, "0");

                return `${day}, ${dateNum} ${month} ${year} - ${hours}:${minutes}`;
              })()}
            </div>
          )}
        </div>

        {/* Separate Table Sections */}
        <div className="space-y-12">
          <TableCard
            title="Pos Duga Air"
            icon={Waves}
            data={posDugaAirData}
            colorClass="text-cyan-600 dark:text-cyan-400"
            iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
            loading={loading}
            emptyMessage="Data POS Duga Air belum tersedia. Jalankan scraper terlebih dahulu."
          />

          <TableCard
            title="Pos Curah Hujan"
            icon={CloudRain}
            data={posCurahHujanData}
            colorClass="text-blue-600 dark:text-blue-400"
            iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            loading={loading}
            emptyMessage="Data POS Curah Hujan belum tersedia. Jalankan scraper terlebih dahulu."
          />

          <TableCard
            title="Pos Klimatologi"
            icon={Thermometer}
            data={posKlimatologiData}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBgClass="bg-orange-50 dark:bg-orange-900/20"
            loading={loading}
            emptyMessage="Data POS Klimatologi belum tersedia. Jalankan scraper terlebih dahulu."
          />
        </div>
      </main>

      <Dock />
    </div>
  );
}
