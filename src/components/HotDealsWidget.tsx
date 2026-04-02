import Link from "next/link";
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
      action={
        <Link className={styles.viewAllBtn} href="/crm">
          Open CRM board
        </Link>
      }
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
            <Link
              key={deal.id}
              className={styles.rowLink}
              href={`/crm?company=${encodeURIComponent(deal.client)}`}
            >
              <div className={styles.dealRow}>
                <div className={styles.dealInfo}>
                  <div className={styles.clientName}>
                    {deal.status === "urgent" ? (
                      <AlertCircle size={12} className={styles.urgentIcon} />
                    ) : null}
                    {deal.client}
                    {deal.isDummy ? " - dummy" : ""}
                  </div>
                  <div className={styles.dealMeta}>
                    {deal.manager} · {deal.region} · {deal.probability}% confidence
                  </div>
                  <div className={styles.dealSubMeta}>{deal.note}</div>
                </div>
                <div className={styles.dealRight}>
                  <div className={`${styles.dealValue} metricValue`}>{formatRevenue(deal.value)}</div>
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
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
