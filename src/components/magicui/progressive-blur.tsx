"use client";

import { cn } from "@/lib/utils";

interface ProgressiveBlurProps {
    className?: string;
    direction?: "top" | "bottom" | "left" | "right";
    blurIntensity?: string;
}

export const ProgressiveBlur = ({
    className,
    direction = "bottom",
    blurIntensity = "8px",
}: ProgressiveBlurProps) => {
    const isVertical = direction === "top" || direction === "bottom";

    // Determine gradient direction for the mask
    // The mask should make the blur visible at the edge and fade out inwards.
    // mask-image: linear-gradient(to {direction}, black, transparent)
    // For "left", we want the blur on the left edge. So gradient starts solid (black) at left? 
    // No, actually we want the element to reside on the left, and fade out towards the right.
    // The element itself is positioned. This component is just the overlay.

    const getGradient = () => {
        switch (direction) {
            case 'top': return 'to bottom';
            case 'bottom': return 'to top';
            case 'left': return 'to right';
            case 'right': return 'to left';
            default: return 'to top';
        }
    };

    return (
        <div
            className={cn(
                "absolute pointer-events-none z-10",
                // Position styles based on direction
                direction === "top" && "top-0 left-0 right-0 h-16 bg-gradient-to-b",
                direction === "bottom" && "bottom-0 left-0 right-0 h-16 bg-gradient-to-t",
                direction === "left" && "left-0 top-0 bottom-0 w-16 bg-gradient-to-r",
                direction === "right" && "right-0 top-0 bottom-0 w-16 bg-gradient-to-l",
                // Note: backdrop-filter works on the element. Masking fades the element (and thus the blur).
                // However, standard "progressive blur" often layers multiple blurred divs. 
                // For simplicity and performance, we'll use a single backdrop-blur with a gradient mask.
                // Actually, just a simple gradient of the background color often works for "fade", 
                // but user asked for "progressive blur" which implies backdrop blur.
                className
            )}
            style={{
                backdropFilter: `blur(${blurIntensity})`,
                WebkitBackdropFilter: `blur(${blurIntensity})`,
                maskImage: `linear-gradient(${getGradient()}, black, transparent)`,
                WebkitMaskImage: `linear-gradient(${getGradient()}, black, transparent)`,
            }}
        />
    );
};
