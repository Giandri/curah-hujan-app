'use client';

import Lottie from 'lottie-react';
import sunny from '@/assets/lottie/sunny.json';
import cloudy from '@/assets/lottie/cloudy.json';
import rainy from '@/assets/lottie/rainy.json';

const animations: any = {
    sunny: sunny,
    cloudy: cloudy,
    rainy: rainy,
};

interface WeatherAnimProps {
    condition: 'sunny' | 'cloudy' | 'rainy'; 
}

export default function WeatherAnimation({ condition }: WeatherAnimProps) {
    const animation = animations[condition] || sunny;

    return (
        <div className="w-full h-full">
            <Lottie animationData={animation} loop autoplay />
        </div>
    );
}
