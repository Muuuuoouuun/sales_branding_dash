"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ko" | "en";
type Currency = "CNY" | "USD";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ko");
  const [currency, setCurrency] = useState<Currency>("CNY");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("app-lang") as Language | null;
    const savedCurr = localStorage.getItem("app-currency") as Currency | null;
    if (savedLang) setLanguage(savedLang);
    if (savedCurr) setCurrency(savedCurr);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("app-lang", language);
      localStorage.setItem("app-currency", currency);
    }
  }, [language, currency, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SettingsContext.Provider value={{ language, setLanguage, currency, setCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      language: "ko" as Language,
      setLanguage: () => {},
      currency: "CNY" as Currency,
      setCurrency: () => {}
    };
  }
  return context;
}
