"use client";

import React from "react";
import Card from "@/components/Card";
import { Search, BookOpen, Star, FileText } from "lucide-react";
import styles from "./page.module.css";

export default function ResearchPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Research & Intelligence Hub</h1>
            <p className={styles.subtitle}>Golden Patterns & Market Insights</p>

            <div className={styles.searchBar}>
                <Search size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search for sales scripts, competitor analysis, or success cases..."
                    className={styles.input}
                />
            </div>

            <h2 className={styles.sectionHeader}>
                <Star size={20} className={styles.iconYellow} /> Golden Patterns (Top 1% Success)
            </h2>
            <div className={styles.grid}>
                <Card>
                    <span className={styles.tag}>Negotation</span>
                    <h3 className={styles.patternTitle}>The "Reciprocity Loop" Script</h3>
                    <p className={styles.patternDesc}>
                        Used by Top Performer (J.Doe) to close 8/10 deals. Focuses on small concessions early to build debt.
                    </p>
                    <div className={styles.metaInfo}>
                        <BookOpen size={16} /> 124 Used
                    </div>
                </Card>

                <Card>
                    <span className={styles.tag} style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>Opening</span>
                    <h3 className={styles.patternTitle}>Executive "Quiet" Opener</h3>
                    <p className={styles.patternDesc}>
                        30-second silent read technique before starting the pitch. Highly effective with C-Level.
                    </p>
                    <div className={styles.metaInfo}>
                        <BookOpen size={16} /> 89 Used
                    </div>
                </Card>
            </div>

            <h2 className={styles.sectionHeader} style={{ marginTop: "2rem" }}>
                <FileText size={20} className={styles.iconBlue} /> Market Intelligence
            </h2>
            <div className={styles.grid}>
                <Card title="Q1 Competitor Movement: TechSector">
                    <p className={styles.patternDesc}>Major price drops observed in Competitor X (Busan region). Counter-strategy: Highlight 'Lifetime Support' value.</p>
                </Card>
            </div>
        </div>
    );
}
