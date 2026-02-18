"use client";

import React from "react";
import Card from "@/components/Card";
import { CheckCircle } from "lucide-react";
import styles from "./page.module.css";

export default function ProjectPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Team Strategy & Vision</h1>
            <p className={styles.subtitle}>Strategic Pivots and High-Level Projects</p>

            <div className={styles.grid}>
                <Card title="Strategic Pivot: The 10x Move">
                    <div className={styles.sectionMargin}>
                        <h4 className={styles.subHeader}>Project "Blue Sky Coverage"</h4>
                        <p className={styles.text}>
                            Shift 40% of SDR resources from saturated 'Busan' market to 'Ulsan Industrial Complex'.
                            Data indicates 3x conversion velocity in Ulsan for Manufacturing vertical.
                        </p>
                    </div>

                    <h5 className={styles.implementationHeader}>Implementation Plan</h5>
                    <div className={styles.steps}>
                        {[
                            "Week 1: Extract leads from Ulsan Chamber of Commerce DB",
                            "Week 2: Deploy 'Manufacturing-First' script to SDR Team A",
                            "Week 3: Daily War Room to optimize hook rates"
                        ].map((step, idx) => (
                            <div key={idx} className={styles.stepItem}>
                                <CheckCircle size={20} style={{ color: "var(--accent)" }} />
                                <span>{step}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Resource Simulation">
                    <div className={styles.simContainer}>
                        <p className={styles.subtitle}>Simulation running...</p>
                        <div className={styles.simValue}>94%</div>
                        <p className={styles.simLabel}>Confidence Level if "Blue Sky" executes</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
