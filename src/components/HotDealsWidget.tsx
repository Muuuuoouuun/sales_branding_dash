import React from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { HotDeal } from "@/types/dashboard";
import Card from "./Card";
import styles from "./HotDealsWidget.module.css";

interface Props {
  deals: HotDeal[];
}

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

export default function HotDealsWidget({ deals }: Props) {
  return (
    <Card
      title="BD hot deals"
      action={<button className={styles.viewAllBtn}>BD priority view</button>}
    >
      <div className={styles.listContainer}>
        {deals.length === 0 ? (
          <div className={styles.dealRow}>
            <div className={styles.dealInfo}>
              <div className={styles.clientName}>No BD deals available</div>
              <div className={styles.dealMeta}>Sheet data did not return any focus accounts yet.</div>
            </div>
          </div>
        ) : (
          deals.map((deal) => (
            <div key={deal.id} className={styles.dealRow}>
              <div className={styles.dealInfo}>
                <div className={styles.clientName}>
                  {deal.status === "urgent" ? (
                    <AlertCircle size={12} className={styles.urgentIcon} />
                  ) : null}
                  {deal.client}
                  {deal.isDummy ? " -더미-" : ""}
                </div>
                <div className={styles.dealMeta}>
                  {deal.note} | {deal.probability}% confidence
                </div>
              </div>
              <div className={styles.dealRight}>
                <div className={styles.dealValue}>{formatRevenue(deal.value)}</div>
                <ChevronRight size={14} className={styles.chevron} />
              </div>
              <div className={styles.probBarWrap}>
                <div
                  className={styles.probBarFill}
                  style={{
                    width: `${deal.probability}%`,
                    background: deal.probability >= 80 ? "var(--accent)" : "var(--warning)",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
