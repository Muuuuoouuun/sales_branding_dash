"use client";

import clsx from "clsx";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

function useHasMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return <span className={clsx(styles.placeholder, className)} aria-hidden="true" />;
  }

  const currentTheme = resolvedTheme ?? "dark";
  const isDark = currentTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={clsx(styles.button, className)}
      aria-label="Toggle Theme"
      aria-pressed={isDark}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
