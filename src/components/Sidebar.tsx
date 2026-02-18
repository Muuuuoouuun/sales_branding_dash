"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, Brain, FileText, Zap } from "lucide-react";
import styles from "./Sidebar.module.css";
import clsx from "clsx";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Project Stra.", href: "/project", icon: Target },
    { name: "CRM Tactics", href: "/crm", icon: Users },
    { name: "Research Hub", href: "/research", icon: Brain },
    { name: "Reports", href: "/report", icon: FileText },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <Zap size={24} className={styles.logoIcon} fill="currentColor" />
                <span>SalesMaster AI</span>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
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
            </div>
        </aside>
    );
}
