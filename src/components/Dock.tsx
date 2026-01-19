"use client";

import { House, Map, LayoutGrid, User, Database } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/animate-ui/components/radix/toggle-group";

export default function Dock() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === "/") return "home";
    if (pathname === "/Map") return "map";
    if (pathname === "/Data" || pathname === "/data") return "data";
    return "home"; // default fallback
  };

  const navItems = [
    { id: "home", icon: House, label: "Home", path: "/" },
    { id: "map", icon: Map, label: "Map", path: "/Map" },
    { id: "data", icon: Database, label: "Data", path: "/Data" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-1000">
      <ToggleGroup
        type="single"
        value={getActiveTab()}
        onValueChange={(value) => {
          const item = navItems.find((item) => item.id === value);
          if (item && item.path) {
            router.push(item.path);
          }
        }}
        className="glass-card-dark rounded-full p-2 px-4 shadow-2xl border border-foreground/10">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = getActiveTab() === item.id;
          return (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              aria-label={item.label}
              className={`
                p-6 px-4 rounded-full transition-all duration-300
                ${isActive ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/10"}
              `}>
              <IconComponent className="h-12 w-12" />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
