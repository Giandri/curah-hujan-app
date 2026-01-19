"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { LatLngExpression } from "leaflet";
import { Droplet, Gauge, Thermometer, ZoomIn, ZoomOut, AlertCircle, MapPin } from "lucide-react";
import Header from "@/components/Header";
import Dock from "@/components/Dock";
import { ToggleGroup, ToggleGroupItem } from "@/components/animate-ui/components/radix/toggle-group";
import L from "leaflet";
import { renderToString } from "react-dom/server";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const LeafletSetup = dynamic(() => import("@/components/LeafletSetup"), { ssr: false });

// POS Location Type
interface POSLocation {
  namaPos: string;
  jenisPos: "PDA" | "PCH" | "KLIMATOLOGI";
  koordinat: string;
  latitude: string;
  longitude: string;
}

const fixLeafletIcons = () => {
  if (typeof window !== "undefined") {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    // Add CSS for POS marker animations
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-pos-marker:hover {
        transform: scale(1.1);
        transition: transform 0.2s ease;
      }
      @keyframes pulse-soft {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.1); }
      }
      .animate-pulse-soft {
        animation: pulse-soft 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

// Get POS type info (color, icon, label)
const getPOSTypeInfo = (jenisPos: string) => {
  switch (jenisPos) {
    case "PDA":
      return {
        label: "Pos Duga Air",
        color: "bg-blue-500",
        borderColor: "border-blue-400",
        textColor: "text-blue-400",
        icon: Gauge,
        description: "Pemantauan Tinggi Muka Air",
      };
    case "PCH":
      return {
        label: "Pos Curah Hujan",
        color: "bg-green-500",
        borderColor: "border-green-400",
        textColor: "text-green-400",
        icon: Droplet,
        description: "Pemantauan Curah Hujan",
      };
    case "KLIMATOLOGI":
      return {
        label: "Pos Klimatologi",
        color: "bg-orange-500",
        borderColor: "border-orange-400",
        textColor: "text-orange-400",
        icon: Thermometer,
        description: "Pemantauan Iklim",
      };
    default:
      return {
        label: "Pos Lainnya",
        color: "bg-gray-500",
        borderColor: "border-gray-400",
        textColor: "text-gray-400",
        icon: MapPin,
        description: "Pos Pemantauan",
      };
  }
};

// POS Marker Component - Pin Shape with pointed bottom
const POSMarkerIcon: React.FC<{ jenisPos: string; namaPos: string }> = ({ jenisPos, namaPos }) => {
  const typeInfo = getPOSTypeInfo(jenisPos);
  const IconComponent = typeInfo.icon;

  // Get hex color for inline styles
  const hexColor = jenisPos === "PDA" ? "#3b82f6" : jenisPos === "PCH" ? "#22c55e" : jenisPos === "KLIMATOLOGI" ? "#f97316" : "#6b7280";

  return (
    <div className="relative flex flex-col items-center animate-fade-in" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}>
      {/* Pin body - rounded top, pointed bottom */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: "36px",
          height: "44px",
          background: hexColor,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          clipPath: "polygon(50% 100%, 0% 35%, 0% 0%, 100% 0%, 100% 35%)",
        }}
      >
        {/* Inner circle with icon */}
        <div
          className="absolute flex items-center justify-center bg-white rounded-full shadow-inner"
          style={{
            width: "26px",
            height: "26px",
            top: "5px",
          }}
        >
          <IconComponent className="w-4 h-4" style={{ color: hexColor }} />
        </div>
      </div>

      {/* Pointed tip (triangle) */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: `16px solid ${hexColor}`,
          marginTop: "-2px",
        }}
      />

      {/* Pulse ring effect */}
      <div
        className="absolute animate-pulse-soft rounded-full opacity-30"
        style={{
          width: "48px",
          height: "48px",
          background: hexColor,
          top: "-4px",
          zIndex: -1,
        }}
      />
    </div>
  );
};

// Create POS marker icon
const createPOSIcon = (jenisPos: string, namaPos: string) => {
  if (typeof window === "undefined") return null;

  const iconHtml = renderToString(<POSMarkerIcon jenisPos={jenisPos} namaPos={namaPos} />);

  return L.divIcon({
    html: iconHtml,
    className: "leaflet-pos-marker",
    iconSize: [48, 72],      // Larger to accommodate pin shape
    iconAnchor: [24, 72],    // Anchor at the pointed tip
    popupAnchor: [0, -72],   // Popup appears above the pin
  });
};

// Custom Zoom Control Component
function CustomZoomControl({ mapRef }: { mapRef: any }) {
  const [zoomMode, setZoomMode] = useState<string>("");

  const handleZoomToggle = (value: string) => {
    if (!mapRef.current) return;

    if (value === "zoom-in") {
      mapRef.current.zoomIn();
    } else if (value === "zoom-out") {
      mapRef.current.zoomOut();
    }

    setTimeout(() => setZoomMode(""), 150);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3, type: "spring", stiffness: 200 }} className="absolute bottom-20 right-4 z-[1000]">
      <ToggleGroup type="single" value={zoomMode} onValueChange={(value) => value && handleZoomToggle(value)} className="glass-card rounded-2xl p-1 shadow-xl border border-foreground/10 bg-background/80 backdrop-blur-md flex flex-col">
        <ToggleGroupItem value="zoom-in" aria-label="Zoom In" className="data-[state=on]:bg-foreground data-[state=on]:text-background rounded-xl h-8 w-8 p-0 transition-all duration-300 hover:scale-110 data-[state=on]:scale-105">
          <ZoomIn className="h-5 w-5" />
        </ToggleGroupItem>
        <ToggleGroupItem value="zoom-out" aria-label="Zoom Out" className="data-[state=on]:bg-foreground data-[state=on]:text-background rounded-xl h-8 w-8 p-0 transition-all duration-300 hover:scale-110 data-[state=on]:scale-105">
          <ZoomOut className="h-5 w-5" />
        </ToggleGroupItem>
      </ToggleGroup>
    </motion.div>
  );
}

// Legend Component
function MapLegend() {
  const posTypes = [
    { type: "PDA", ...getPOSTypeInfo("PDA") },
    { type: "PCH", ...getPOSTypeInfo("PCH") },
    { type: "KLIMATOLOGI", ...getPOSTypeInfo("KLIMATOLOGI") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.3 }}
      className="absolute bottom-20 left-4 z-[1000] glass-card rounded-2xl p-3 shadow-xl border border-foreground/10 bg-background/90 backdrop-blur-md"
    >
      <div className="text-xs font-semibold text-foreground mb-2">Legenda Pos</div>
      <div className="space-y-2">
        {posTypes.map((pos) => (
          <div key={pos.type} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${pos.color}`}></div>
            <span className="text-xs text-foreground/80">{pos.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function MapPage() {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posLocations, setPosLocations] = useState<POSLocation[]>([]);
  const mapRef = useRef(null);

  // Fetch POS locations from API
  useEffect(() => {
    const fetchPOSLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🗺️ Fetching POS locations...");
        const response = await fetch("/api/pos-locations");

        if (!response.ok) throw new Error("Failed to fetch POS locations");

        const result = await response.json();

        if (result.success && result.data) {
          setPosLocations(result.data);
          console.log(`✅ Loaded ${result.data.length} POS locations`);
        } else {
          throw new Error(result.error || "No data received");
        }
      } catch (error: any) {
        console.error("❌ Failed to load POS locations:", error);
        setError("Gagal memuat data lokasi pos. " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPOSLocations();
  }, []);

  useEffect(() => {
    setIsClient(true);
    fixLeafletIcons();
  }, []);

  // Default position (Bangka Belitung center)
  const defaultCenter: LatLngExpression = [-2.5, 106.5];
  const defaultZoom = 7;

  // Count by type
  const countByType = {
    PDA: posLocations.filter((p) => p.jenisPos === "PDA").length,
    PCH: posLocations.filter((p) => p.jenisPos === "PCH").length,
    KLIMATOLOGI: posLocations.filter((p) => p.jenisPos === "KLIMATOLOGI").length,
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden transition-colors duration-300">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header />
        </div>
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <div className="text-lg font-medium text-foreground/80">Loading POS Map</div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <Dock />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden transition-colors duration-300">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header />
        </div>
        <div className="fixed inset-0 flex items-center justify-center z-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Gagal Memuat Peta</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
              Coba Lagi
            </button>
          </motion.div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <Dock />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden transition-colors duration-300">
      <LeafletSetup />

      {/* Full Screen Map Container */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <MapContainer ref={mapRef} center={defaultCenter} zoom={defaultZoom} zoomControl={false} style={{ height: "100%", width: "100%" }} className="relative">
          {/* Esri World Imagery */}
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; <a href="https://www.esri.com/">Esri</a>' />

          {/* POS Location Markers */}
          {posLocations.map((pos, index) => {
            const lat = parseFloat(pos.latitude);
            const lon = parseFloat(pos.longitude);

            if (isNaN(lat) || isNaN(lon)) return null;

            const posIcon = createPOSIcon(pos.jenisPos, pos.namaPos);
            if (!posIcon) return null;

            const typeInfo = getPOSTypeInfo(pos.jenisPos);
            const IconComponent = typeInfo.icon;

            return (
              <Marker key={`${pos.namaPos}-${index}`} position={[lat, lon] as LatLngExpression} icon={posIcon}>
                <Popup className="pos-popup">
                  <div className="p-4 min-w-[220px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl -m-3 border border-white/10">
                    {/* Header with icon */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${pos.jenisPos === "PDA" ? "#3b82f6, #1d4ed8" : pos.jenisPos === "PCH" ? "#22c55e, #16a34a" : "#f97316, #ea580c"})`
                        }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-base leading-tight">{pos.namaPos}</h3>
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: pos.jenisPos === "PDA" ? "rgba(59,130,246,0.2)" : pos.jenisPos === "PCH" ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.2)",
                            color: pos.jenisPos === "PDA" ? "#60a5fa" : pos.jenisPos === "PCH" ? "#4ade80" : "#fb923c"
                          }}
                        >
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-xs mb-3">{typeInfo.description}</p>

                    {/* Coordinates */}
                    <div className="bg-black/30 rounded-lg p-2">
                      <div className="flex items-center gap-2 text-[10px]">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500">Koordinat</span>
                      </div>
                      <p className="text-gray-300 font-mono text-xs mt-1">{lat.toFixed(6)}, {lon.toFixed(6)}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Custom Zoom Controls */}
          <CustomZoomControl mapRef={mapRef} />
        </MapContainer>

        {/* Map Header Overlay */}
        <div className="absolute top-20 sm:top-24 md:top-28 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="glass-card-dark rounded-2xl px-4 py-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${loading ? "bg-yellow-500" : "bg-green-500"}`}></div>
              <div>
                <span className="text-xs font-semibold text-foreground block">Peta Lokasi POS</span>
                <span className="text-xs text-foreground/50">{posLocations.length} lokasi aktif</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl px-4 py-3 pointer-events-auto transition-colors duration-300">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-foreground font-medium">PDA: {countByType.PDA}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-foreground font-medium">PCH: {countByType.PCH}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-foreground font-medium">Klim: {countByType.KLIMATOLOGI}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <MapLegend />
      </div>

      {/* Header Overlay */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      {/* Dock Overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Dock />
      </div>
    </div>
  );
}

// Disable SSR for this page
export const runtime = "edge";
