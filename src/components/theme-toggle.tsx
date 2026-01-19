"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-28 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
        <div className="h-4 w-4 animate-pulse rounded-full bg-stone-300 dark:bg-stone-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1 dark:bg-stone-800">
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
          theme === "light"
            ? "bg-white text-amber-500 shadow-sm dark:bg-stone-700"
            : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        )}
        aria-label="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
          theme === "dark"
            ? "bg-white text-indigo-500 shadow-sm dark:bg-stone-700"
            : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        )}
        aria-label="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
          theme === "system"
            ? "bg-white text-lime-500 shadow-sm dark:bg-stone-700"
            : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        )}
        aria-label="System theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
