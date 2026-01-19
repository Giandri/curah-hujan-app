import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import LogoPU from "@/assets/images/logo_pu.png";
import LogoBWS from "@/assets/images/logo_bws.jpg";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as "Hari, Tanggal - Jam"
  const formatTime = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}, ${dateNum} ${month} ${year} - ${hours}:${minutes}`;
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 50) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.div
      variants={{
        visible: { y: 0 },
        hidden: { y: "-110%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 left-0 right-0 z-[100] w-full bg-white rounded-b-3xl sm:rounded-b-[40px] shadow-lg overflow-hidden shrink-0">
      {/* Bottom Yellow Accent Border */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#FFD700]"></div>

      {/* Main Content */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-4">
        {/* Left: Logo PU & Logo BWS */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="relative h-10 w-32 sm:h-12 sm:w-40 flex-shrink-0">
            <Image src={LogoPU} alt="PU Logo - Sigap Membangun Negeri" fill className="object-contain object-left" priority />
          </div>
          <div className="relative h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
            <Image src={LogoBWS} alt="BWS Bangka Belitung Logo" fill className="object-contain" priority />
          </div>
        </div>

        {/* Right: Clock & Theme Toggler */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Clock */}
          <div className="font-mono text-xs sm:text-sm text-black px-2 py-1" suppressHydrationWarning>
            {formatTime(currentTime)}
          </div>

          {/* Theme Toggler */}
          <AnimatedThemeToggler />
        </div>
      </div>

      {/* Decorative corner curve simulation (optional based on image, simpler with border-radius) */}
    </motion.div>
  );
}
