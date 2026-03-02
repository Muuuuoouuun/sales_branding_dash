import React from 'react';
import styles from './GoalTracker.module.css';
import { Target, Flag, TrendingUp, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface Milestone {
    label: string;
    value: number;
    achieved: boolean;
}

interface GoalTrackerProps {
    title: string;
    currentKpi: number;
    monthlyTarget: number;
    quarterlyTarget: number;
    milestones: Milestone[];
    unit?: string;
}

export default function GoalTracker({
    title,
    currentKpi,
    monthlyTarget,
    quarterlyTarget,
    milestones,
    unit = ''
}: GoalTrackerProps) {
    // Use quarterly target as 100% of the bar if not exceeded, else slightly more
    const maxScale = Math.max(quarterlyTarget * 1.1, currentKpi);
    const progressPercent = (currentKpi / maxScale) * 100;
    const monthlyPercent = (monthlyTarget / maxScale) * 100;
    const quarterlyPercent = (quarterlyTarget / maxScale) * 100;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <TrendingUp className={styles.icon} size={20} />
                    <h3 className={styles.title}>{title}</h3>
                </div>
                <div className={styles.currentValueBox}>
                    <span className={styles.currentLabel}>Current</span>
                    <span className={styles.currentValue}>{currentKpi.toLocaleString()}{unit}</span>
                </div>
            </div>

            <div className={styles.trackArea}>
                <div className={styles.trackBackground}>
                    {/* Main Progress Bar */}
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progressPercent}%` }}
                    />

                    {/* Monthly Target Line */}
                    <div
                        className={styles.targetLine}
                        style={{ left: `${monthlyPercent}%` }}
                    >
                        <div className={styles.targetLabel}>
                            <Target size={12} />
                            <span>Month</span>
                            <strong>{monthlyTarget.toLocaleString()}{unit}</strong>
                        </div>
                    </div>

                    {/* Quarterly Target Line */}
                    <div
                        className={clsx(styles.targetLine, styles.quarterLine)}
                        style={{ left: `${quarterlyPercent}%` }}
                    >
                        <div className={styles.targetLabel}>
                            <Flag size={12} />
                            <span>Quarter</span>
                            <strong>{quarterlyTarget.toLocaleString()}{unit}</strong>
                        </div>
                    </div>

                    {/* Milestones */}
                    {milestones.map((m, idx) => {
                        const mPercent = (m.value / maxScale) * 100;
                        return (
                            <div
                                key={idx}
                                className={clsx(styles.milestoneMarker, m.achieved && styles.milestoneAchieved)}
                                style={{ left: `${mPercent}%` }}
                            >
                                <div className={styles.milestoneDot}>
                                    {m.achieved && <CheckCircle2 size={12} />}
                                </div>
                                <div className={styles.milestoneText}>
                                    <span>{m.label}</span>
                                    <strong>{m.value.toLocaleString()}{unit}</strong>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
