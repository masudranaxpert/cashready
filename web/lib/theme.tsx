"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export type Theme = "dark" | "light";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "cashready.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      // Default to dark mode for MFS terminal aesthetic
      applyTheme("dark");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <Ctx.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}

/** Accessible theme toggle button (Light / Dark) */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] p-2 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 bg-navy-900/80 border border-white/[0.1] hover:border-emerald-500/40 focus-visible:ring-2 focus-visible:ring-emerald-400 text-slate-300 hover:text-white shadow-sm ${className}`}
      aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={theme === "dark" ? "Light Mode" : "Dark Mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-emerald-600 transition-transform duration-200" />
      )}
    </button>
  );
}
