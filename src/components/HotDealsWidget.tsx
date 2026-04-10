import Link from "next/link";
import React from "react";
import { AlertCircle, ArrowUpRight, Inbox } from "lucide-react";
import { formatRevenue } from "@/lib/formatCurrency";
import type { HotDeal } from "@/types/dashboard";
import Card from "./Card";
import styles from "./HotDealsWidget.module.css";

interface Props {
  deals: HotDeal[];
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
          <div className={styles.emptyState}>
            <Inbox size={28} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>아직 핫딜이 없습니다</p>
            <p className={styles.emptyDesc}>REV 시트에 집중 계정을 추가하면<br />여기에 자동으로 표시됩니다.</p>
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
                  </div>
                  <div className={styles.dealMeta}>
                    {deal.manager} · {deal.region} · 확률 {deal.probability}%
                  </div>
                  <div className={styles.dealSubMeta}>{deal.note}</div>
                </div>
                <div className={styles.dealRight}>
                  <div className={`${styles.dealValue} metricValue`}>{formatRevenue(deal.value)}</div>
                  <ArrowUpRight size={14} className={styles.chevron} />
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
