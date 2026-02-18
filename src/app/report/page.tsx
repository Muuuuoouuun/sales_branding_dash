"use client";

import React from "react";
import { FileText, Download, Share2 } from "lucide-react";
import styles from "./page.module.css";

const reports = [
    { title: "Weekly Bottleneck Analysis (Region: Seoul)", date: "Feb 5, 2026", type: "PDF" },
    { title: "Individual Performance Audit: Sales Team A", date: "Feb 4, 2026", type: "Excel" },
    { title: "Q1 Strategic Pivot Plan (Official)", date: "Jan 30, 2026", type: "PDF" },
    { title: "Competitor Movement Alert: TechSector", date: "Jan 28, 2026", type: "PDF" },
];

export default function ReportPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Automated Reports</h1>
            <p className={styles.subtitle}>Bottleneck Destroyers & Strategic Audits</p>

            <div className={styles.reportList}>
                {reports.map((report, idx) => (
                    <div key={idx} className={styles.reportItem}>
                        <div className={styles.reportInfo}>
                            <div className={styles.iconBox}>
                                <FileText size={24} />
                            </div>
                            <div className={styles.reportText}>
                                <span className={styles.reportTitle}>{report.title}</span>
                                <span className={styles.reportDate}>{report.date} • {report.type}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.downloadBtn}>
                                <Share2 size={16} /> Share
                            </button>
                            <button className={styles.downloadBtn}>
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
