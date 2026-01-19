"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

// Type declarations for View Transitions API
declare global {
  interface Document {
    startViewTransition(callback: () => void): ViewTransition;
  }

  interface ViewTransition {
    readonly ready: Promise<void>;
  }
}

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
}

export const AnimatedThemeToggler = ({ className, duration = 400, ...props }: AnimatedThemeTogglerProps) => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current || !mounted) return;

    const newTheme = isDark ? "light" : "dark";

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    }).ready;

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(Math.max(left, window.innerWidth - left), Math.max(top, window.innerHeight - top));

    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, [isDark, setTheme, duration, mounted]);

  if (!mounted) {
    return (
      <button className={cn("w-10 h-10 rounded-full bg-transparent", className)} disabled {...props}>
        <div className="w-5 h-5 bg-muted rounded animate-pulse" />
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
        "bg-transparent hover:bg-black/5 dark:hover:bg-white/10",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}>
      <div className="relative w-full h-full flex items-center justify-center">
        {isDark ? <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 transition-transform duration-200 hover:scale-110" /> : <Moon className="h-[1.2rem] w-[1.2rem] text-gray-950 transition-transform duration-200 hover:scale-110" />}
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};
