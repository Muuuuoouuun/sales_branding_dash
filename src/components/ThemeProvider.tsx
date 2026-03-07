"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

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

// ── Provider ──────────────────────────────────────────────────────────────────
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // 마운트 시 localStorage → html 클래스 적용
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) ?? "dark";
    setTheme(saved);
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (next === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
