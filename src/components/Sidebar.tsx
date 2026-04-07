"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Brain,
    Database,
    FileText,
    LayoutDashboard,
    Menu,
    Target,
    Users,
    X,
    Zap,
} from "lucide-react";
import clsx from "clsx";
import styles from "./Sidebar.module.css";
import ThemeToggle from "./ThemeToggle";
import SettingsControls from "./SettingsControls";

const NAV_ITEMS = {
    en: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Strategy Room", href: "/project", icon: Target },
        { name: "CRM", href: "/crm", icon: Users },
        { name: "Research", href: "/research", icon: Brain },
        { name: "Reports", href: "/report", icon: FileText },
        { name: "Data", href: "/data", icon: Database },
    ],
    ko: [
        { name: "대시보드", href: "/", icon: LayoutDashboard },
        { name: "전략 룸", href: "/project", icon: Target },
        { name: "고객 관리(CRM)", href: "/crm", icon: Users },
        { name: "리서치", href: "/research", icon: Brain },
        { name: "보고서", href: "/report", icon: FileText },
        { name: "데이터", href: "/data", icon: Database },
    ]
};

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
    const mobileNavOpen = mobileNavPath === pathname;

    // We can read language directly if we use it inside Provider, but Sidebar is inside SettingsProvider.
    // However, since we want to avoid hydrating errors on server, let's pick up language securely, or just use localStorage.
    // To gracefully use SettingsProvider, we can import useSettings
    const { language } = require("./SettingsProvider").useSettings();
    const currentNavItems = language === "ko" ? NAV_ITEMS.ko : NAV_ITEMS.en;

    return (
        <aside className={styles.sidebar} data-mobile-open={mobileNavOpen ? "true" : "false"}>
            <div className={styles.headerRow}>
                <Link href="/" className={styles.logo} onClick={() => setMobileNavPath(null)}>
                    <Zap size={24} className={styles.logoIcon} fill="currentColor" />
                    <span>Sales Master</span>
                </Link>

                <div className={styles.headerActions}>
                    <ThemeToggle className={styles.themeToggle} />
                    <button
                        type="button"
                        className={styles.mobileMenuButton}
                        onClick={() =>
                            setMobileNavPath((current) => (current === pathname ? null : pathname))
                        }
                        aria-expanded={mobileNavOpen}
                        aria-controls="primary-navigation"
                        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                    >
                        {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                        <span>{mobileNavOpen ? "Close" : "Menu"}</span>
                    </button>
                </div>
            </div>

            <nav
                id="primary-navigation"
                className={styles.nav}
                aria-label="Primary"
            >
                {currentNavItems.map((item: any) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(styles.navItem, isActive && styles.active)}
                            onClick={() => setMobileNavPath(null)}
                        >
                            <item.icon />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.userSection} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                <SettingsControls />
                <div className={styles.userCard}>
                    <div className={styles.avatar}>TC</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{language === "ko" ? "탑-C 관리자" : "Top-C Admin"}</span>
                        <span className={styles.userRole}>{language === "ko" ? "전략 리드" : "Strategy Lead"}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
