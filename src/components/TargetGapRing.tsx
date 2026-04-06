import React from "react";
import { CalendarDays, Target, TrendingUp } from "lucide-react";
import { getFiscalCalendarInfo } from "@/lib/fiscalCalendar";
import { formatRevenue } from "@/lib/formatCurrency";
import type { TeamSummary } from "@/types/dashboard";
import Card from "./Card";
import styles from "./TargetGapRing.module.css";

interface Props {
  teamSummary: TeamSummary;
  periodLabel: string;
}


function getDaysRemainingInMonth(): number {
  const info = getFiscalCalendarInfo();
  const lastDay = new Date(Date.UTC(info.calendarYear, info.calendarMonth, 0)).getUTCDate();
  return Math.max(lastDay - info.calendarDay, 0);
}

export default function TargetGapRing({ teamSummary, periodLabel }: Props) {
  const current = teamSummary.actualRevenue;
  const target = teamSummary.targetRevenue;
  const gap = Math.max(teamSummary.gapRevenue, 0);
  const progress = target > 0 ? Math.round((current / target) * 100) : 0;
  const remainingDays = getDaysRemainingInMonth();
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  const perDay = remainingDays > 0 ? Math.round(gap / remainingDays) : gap;

  return (
    <Card title={`${periodLabel} gap tracker`} action={<Target size={14} className={styles.icon} />}>
      <div className={styles.layout}>
        <div className={styles.ringContainer} style={{ width: size, height: size }}>
          <svg width={size} height={size} className={styles.svg}>
            <circle
              className={styles.bgCircle}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <circle
              className={styles.progressCircle}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className={styles.ringText}>
            <span className={styles.percentage}>{progress}%</span>
            <span className={styles.label}>attainment</span>
          </div>
        </div>

        <div className={styles.infoContainer}>
          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>Current revenue</div>
            <div className={styles.currentValue}>{formatRevenue(current)}</div>
          </div>
          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>Remaining gap</div>
            <div className={styles.gapValue}>{gap > 0 ? formatRevenue(gap) : "On plan"}</div>
          </div>
          <div className={styles.divider} />
          <div className={styles.actionStats}>
            <div className={styles.actionStat}>
              <CalendarDays size={12} className={styles.actionIcon} />
              <span>
                Days left in month <strong>{remainingDays}</strong>
              </span>
            </div>
            <div className={styles.actionStat}>
              <TrendingUp size={12} className={styles.actionIconSuccess} />
              <span>
                Needed per day <strong>{gap > 0 ? formatRevenue(perDay) : "0"}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
