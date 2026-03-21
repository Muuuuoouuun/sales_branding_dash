"use client";

import { createContext, useContext, useEffect, useState } from "react";

// ── Theme Types & Context ──────────────────────────────────────────────────────
export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return localStorage.getItem("theme") === "light" ? "light" : "dark";
}

// ── Provider ──────────────────────────────────────────────────────────────────
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // 마운트 시 localStorage → html 클래스 적용
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
