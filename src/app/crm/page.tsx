"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/Card";
import { Phone, Mail, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import styles from "./page.module.css";
import clsx from "clsx";

interface FocusScore {
    name: string;
    score: number;
    label: string;
}

interface ActionItem {
    salesRep: string;
    target: string;
    prob: string;
    action: string;
    due: string;
}

export default function CRMPage() {
    const [scores, setScores] = useState<FocusScore[]>([]);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCrmData = async () => {
            try {
                const res = await fetch('/api/crm/leads');
                const data = await res.json();
                setScores(data.scores);
                setActions(data.actions);
            } catch (error) {
                console.error("Failed to fetch CRM data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCrmData();
    }, []);

    if (loading) {
        return (
            <div className={styles.container} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>CRM Strategy (Tactics)</h1>
            <p className={styles.subtitle}>Personalized Focus Scores & Next Best Actions</p>

            <div className={styles.scoreGrid}>
                {scores.map((item) => (
                    <Card key={item.name} title={`Focus Score: ${item.name}`}>
                        <div className={styles.scoreHeader}>
                            <span className={styles.scoreValue}>{item.score}</span>
                            <span className={styles.scoreLabel}>{item.label}</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${item.score}%` }}></div>
                        </div>
                    </Card>
                ))}
            </div>

            <h2 className={styles.sectionTitle}>Today's Kill-List (Top Priority)</h2>
            <div className={styles.actionList}>
                {actions.map((item, idx) => (
                    <div key={idx} className={clsx("glass", styles.actionItem)}>
                        <div style={{ flex: 1 }}>
                            <div className={styles.metaInfo}>
                                <span className={styles.repBadge}>{item.salesRep}</span>
                                <span className={styles.targetName}>{item.target}</span>
                                <span className={styles.probText}>Prob: <span style={{ color: "white" }}>{item.prob}</span></span>
                            </div>
                            <p className={styles.actionText}>{item.action}</p>
                        </div>

                        <div className={styles.controls}>
                            <div style={{ textAlign: "right" }}>
                                <div className={styles.dueDate}>Due: {item.due}</div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className={styles.iconBtn}><Phone size={20} /></button>
                                <button className={styles.iconBtn}><Mail size={20} /></button>
                                <button className={styles.iconBtn}><MessageSquare size={20} /></button>
                            </div>
                            <button className={styles.execBtn}>
                                Execute <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
