"use client";

import clsx from "clsx";
import { useSettings } from "./SettingsProvider";
import styles from "./ThemeToggle.module.css";
import React from "react";

type SettingsControlsProps = {
  className?: string;
};

function useHasMounted() {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}

export default function SettingsControls({ className }: SettingsControlsProps) {
  const { language, setLanguage, currency, setCurrency } = useSettings();
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return (
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} className={className}>
        <span className={clsx(styles.placeholder)} aria-hidden="true" />
        <span className={clsx(styles.placeholder)} aria-hidden="true" />
      </div>
    );
  }

  const handleLanguageToggle = () => {
    const newLang = language === "ko" ? "en" : "ko";
    setLanguage(newLang);
    localStorage.setItem("app-lang", newLang);
    window.location.reload();
  };

  const handleCurrencyToggle = () => {
    const newCurr = currency === "CNY" ? "USD" : "CNY";
    setCurrency(newCurr);
    localStorage.setItem("app-currency", newCurr);
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} className={className}>
      <button
        onClick={handleLanguageToggle}
        className={clsx(styles.button)}
        aria-label="Toggle Language"
        title="Toggle Language"
        style={{ fontSize: '0.85rem', fontWeight: 'bold' }}
      >
        {language === "ko" ? "한" : "EN"}
      </button>
      <button
        onClick={handleCurrencyToggle}
        className={clsx(styles.button)}
        aria-label="Toggle Currency"
        title="Toggle Currency"
        style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}
      >
        {currency === "CNY" ? "¥" : "$"}
      </button>
    </div>
  );
}
