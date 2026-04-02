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

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Strategy", href: "/project", icon: Target },
    { name: "CRM", href: "/crm", icon: Users },
    { name: "Research", href: "/research", icon: Brain },
    { name: "Data", href: "/data", icon: Database },
    { name: "Reports", href: "/report", icon: FileText },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
    const mobileNavOpen = mobileNavPath === pathname;

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
                {navItems.map((item) => {
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

            <div className={styles.userSection}>
                <div className={styles.userCard}>
                    <div className={styles.avatar}>TC</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>Top-C Admin</span>
                        <span className={styles.userRole}>Strategy Lead</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
