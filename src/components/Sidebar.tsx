"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Target, Users, Brain,
  FileText, Zap, Database, Menu, X, Sun, Moon, UserCog,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { name: "Dashboard",     href: "/",        icon: LayoutDashboard },
  { name: "Project Stra.", href: "/project", icon: Target },
  { name: "CRM Tactics",  href: "/crm",     icon: Users },
  { name: "팀 관리",       href: "/team",    icon: UserCog },
  { name: "Research Hub",  href: "/research", icon: Brain },
  { name: "Input Data",    href: "/data",    icon: Database },
  { name: "Reports",       href: "/report",  icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // 페이지 이동 시 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 모바일에서 열렸을 때 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── 햄버거 버튼 (모바일 전용) ── */}
      <button
        className={styles.hamburger}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── 오버레이 배경 ── */}
      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── 사이드바 ── */}
      <aside className={clsx(styles.sidebar, open && styles.sidebarOpen)}>
        <div className={styles.logo}>
          <Zap size={24} className={styles.logoIcon} fill="currentColor" />
          <span>SalesMaster AI</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(styles.navItem, isActive && styles.active)}
              >
                <item.icon />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.avatar}>TC</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Top-C Admin</span>
            <span className={styles.userRole}>Strategy Lead</span>
          </div>
          <button
            className={styles.themeToggle}
            onClick={toggle}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </aside>
    </>
  );
}
