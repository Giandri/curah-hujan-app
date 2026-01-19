"use client";

import Lottie from "lottie-react";
import sunny from "@/assets/lottie/sunny.json";
import cloudy from "@/assets/lottie/cloudy.json";
import rainy from "@/assets/lottie/rainy.json";

const animations: any = {
  sunny: sunny,
  cloudy: cloudy,
  rainy: rainy,
};

interface WeatherAnimProps {
  condition: "sunny" | "cloudy" | "rainy"; // Dari data Higertech atau BMKG
}

export default function WeatherAnimation({ condition }: WeatherAnimProps) {
  const animation = animations[condition] || sunny;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="transform scale-125 sm:scale-150 md:scale-175 lg:scale-200">
        <Lottie
          animationData={animation}
          loop
          autoplay
          style={{
            width: "100px",
            height: "100px",
            minWidth: "80px",
            minHeight: "80px",
          }}
        />
      </div>
    </div>
  );
}
