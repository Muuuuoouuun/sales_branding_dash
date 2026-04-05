"use client";

import React, { useState } from "react";
import { AlertCircle, GripVertical, RefreshCw } from "lucide-react";
import Card from "./Card";
import styles from "./PipelineKanban.module.css";

type DealStage = "Lead" | "Proposal" | "Negotiation" | "Contract";

interface Lead {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: DealStage;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  due_label: string;
  action: string;
}

interface Score {
  name: string;
  score: number;
  label: string;
  won: number;
  pipeline: number;
  deals: number;
}

interface ActionItem {
  salesRep: string;
  target: string;
  prob: string;
  action: string;
  due: string;
  region: string;
  stage: string;
}

interface Props {
  leads: Lead[];
  scores: Score[];
  actions: ActionItem[];
  onMoveLead: (leadId: number, stage: DealStage) => Promise<void> | void;
}

const STAGES: DealStage[] = ["Lead", "Proposal", "Negotiation", "Contract"];

function formatRevenue(value: number): string {
  return `${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}${ Math.round(value).toLocaleString() }M`;
}

export default function PipelineKanban({ leads, scores, actions, onMoveLead }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverStage, setHoverStage] = useState<DealStage | null>(null);
  const totalWeighted = leads.reduce((sum, lead) => sum + lead.revenue_potential * (lead.probability / 100), 0);
  const openLeads = leads.filter((lead) => lead.stage !== "Contract").length;

  const move = async (leadId: number, stage: DealStage) => {
    await onMoveLead(leadId, stage);
    setDraggingId(null);
    setHoverStage(null);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.summaryRow}>
        <Card className={styles.summaryCard} title="Open leads">
          <div className={styles.summaryValue}>{openLeads}</div>
          <div className={styles.summaryHint}>active pipeline items</div>
        </Card>
        <Card className={styles.summaryCard} title="Weighted value">
          <div className={styles.summaryValue}>{formatRevenue(totalWeighted)}</div>
          <div className={styles.summaryHint}>probability-adjusted</div>
        </Card>
        <Card className={styles.summaryCard} title="Priority action">
          <div className={styles.summaryValue}>{actions[0]?.prob ?? "n/a"}</div>
          <div className={styles.summaryHint}>{actions[0]?.target ?? "No action yet"}</div>
        </Card>
      </div>

      <div className={styles.board}>
        <div className={styles.columns}>
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stage === stage).sort((a, b) => b.probability - a.probability);
            const stageValue = stageLeads.reduce((sum, lead) => sum + lead.revenue_potential, 0);

            return (
              <div
                key={stage}
                className={`${styles.column} ${hoverStage === stage ? styles.columnHover : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoverStage(stage);
                }}
                onDragLeave={() => setHoverStage(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const leadId = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isFinite(leadId)) {
                    void move(leadId, stage);
                  }
                }}
              >
                <div className={styles.columnHeader}>
                  <div>
                    <div className={styles.columnTitle}>{stage}</div>
                    <div className={styles.columnMeta}>{stageLeads.length} deals</div>
                  </div>
                  <div className={styles.columnValue}>{formatRevenue(stageValue)}</div>
                </div>

                <div className={styles.cardList}>
                  {stageLeads.length === 0 ? (
                    <div className={styles.emptyState}>Drop a deal here</div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(event) => {
                          setDraggingId(lead.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(lead.id));
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className={`${styles.dealCard} ${draggingId === lead.id ? styles.dealCardDragging : ""}`}
                      >
                        <div className={styles.dealTop}>
                          <div>
                            <div className={styles.dealCompany}>{lead.company}</div>
                            <div className={styles.dealMeta}>{lead.owner} | {lead.region}</div>
                          </div>
                          <GripVertical size={14} className={styles.dragIcon} />
                        </div>
                        <div className={styles.dealValue}>{formatRevenue(lead.revenue_potential)}</div>
                        <div className={styles.dealBody}>
                          <span className={styles.probBadge}>{lead.probability}%</span>
                          <span>{lead.due_label}</span>
                        </div>
                        <div className={styles.dealAction}>{lead.action}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside className={styles.sideRail}>
          <Card title="Focus scores" action={<RefreshCw size={14} className={styles.railIcon} />}>
            <div className={styles.scoreList}>
              {scores.slice(0, 5).map((score) => (
                <div key={score.name} className={styles.scoreRow}>
                  <div>
                    <div className={styles.scoreName}>{score.name}</div>
                    <div className={styles.scoreMeta}>{score.label} | {score.deals} deals</div>
                  </div>
                  <div className={styles.scoreValue}>{score.score}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Next actions">
            <div className={styles.actionList}>
              {actions.slice(0, 5).map((action) => (
                <div key={`${action.target}-${action.due}`} className={styles.actionRow}>
                  <div className={styles.actionHeader}>
                    <span className={styles.actionOwner}>{action.salesRep}</span>
                    <span className={styles.actionProb}>{action.prob}</span>
                  </div>
                  <div className={styles.actionTarget}>{action.target}</div>
                  <div className={styles.actionCopy}>{action.action}</div>
                  <div className={styles.actionFoot}>{action.region} | {action.stage} | {action.due}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Urgent watch">
            <div className={styles.watchList}>
              {leads
                .filter((lead) => lead.probability >= 40 && lead.stage !== "Contract")
                .slice(0, 4)
                .map((lead) => (
                  <div key={lead.id} className={styles.watchRow}>
                    <div>
                      <div className={styles.watchName}>
                        {lead.company}
                        {lead.probability >= 80 ? <AlertCircle size={12} className={styles.alertIcon} /> : null}
                      </div>
                      <div className={styles.watchMeta}>{lead.owner} | {lead.due_label}</div>
                    </div>
                    <div className={styles.watchValue}>{lead.probability}%</div>
                  </div>
                ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
