"use client";

import { useState } from "react";
import { Lightbulb, ChevronRight } from "lucide-react";
import { getDailyTip, recordTipRead } from "@/lib/salesTips";
import styles from "./SalesTip.module.css";

interface Props {
  /** Offset from today's tip index so multiple strips show different tips */
  offset?: number;
}

export default function SalesTip({ offset = 0 }: Props) {
  const [delta, setDelta] = useState(0);
  const tip = getDailyTip(offset + delta);

  return (
    <div className={styles.strip} style={{ borderLeftColor: tip.color }}>
      <Lightbulb size={12} className={styles.icon} style={{ color: tip.color }} />
      <span
        className={styles.badge}
        style={{
          color: tip.color,
          borderColor: `${tip.color}40`,
          background: `${tip.color}14`,
        }}
      >
        {tip.methodologyKr}
      </span>
      <p className={styles.text}>
        {tip.tip}
        {tip.source && (
          <span className={styles.source}> — {tip.source}</span>
        )}
      </p>
      <button
        className={styles.nextBtn}
        onClick={() => { setDelta(d => d + 1); recordTipRead(); }}
        title="다음 팁"
        aria-label="다음 팁 보기"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
