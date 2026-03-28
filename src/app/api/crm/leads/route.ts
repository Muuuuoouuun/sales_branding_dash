import { NextResponse } from "next/server";
import { listLeads } from "@/lib/server/salesData";

const STAGES = ["Lead", "Proposal", "Negotiation", "Contract"] as const;
const TIME_ZONE = "Asia/Seoul";

type StageName = (typeof STAGES)[number];

function getSeoulNow(): Date {
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIME_ZONE }),
  );
  local.setHours(0, 0, 0, 0);
  return local;
}

function toSeoulMidnight(dateValue: string): Date | null {
  const normalized = dateValue.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysUntilDue(dateValue: string): number | null {
  const due = toSeoulMidnight(dateValue);
  if (!due) {
    return null;
  }

  const diffMs = due.getTime() - getSeoulNow().getTime();
  return Math.ceil(diffMs / 86_400_000);
}

function formatDueLabel(dateValue: string): string {
  const days = getDaysUntilDue(dateValue);
  if (days === null) {
    return "No due date";
  }

  if (days < 0) {
    return `Overdue ${Math.abs(days)}d`;
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "Due tomorrow";
  }

  return `Due in ${days}d`;
}

function getActionText(stage: StageName, probability: number): string {
  if (stage === "Negotiation" && probability >= 70) {
    return "Lock commercial terms, confirm the decision owner, and move for signature.";
  }

  if (stage === "Negotiation") {
    return "Rework the economic case, reopen the blocker, and book the next decision call.";
  }

  if (stage === "Proposal" && probability >= 65) {
    return "Tighten scope, align the review path, and remove one approval blocker.";
  }

  if (stage === "Proposal") {
    return "Sharpen the value case and push the next meeting onto the calendar.";
  }

  if (stage === "Contract") {
    return "Finalize signature path and prep the handoff sequence.";
  }

  return "Qualify the next meeting and move the deal one stage forward.";
}

function getUrgencyScore(probability: number, daysUntilDue: number | null): number {
  const duePressure = daysUntilDue === null ? 0 : daysUntilDue < 0 ? 45 : daysUntilDue <= 3 ? 25 : daysUntilDue <= 7 ? 10 : 0;
  const probabilityPressure = Math.max(0, 60 - probability);
  return Math.min(100, probabilityPressure + duePressure);
}

export async function GET() {
  const { backend, rows } = await listLeads();

  const leads = rows
    .map((lead) => {
      const probability = Number(lead.probability);
      const daysUntilDue = getDaysUntilDue(lead.due_date);

      return {
        id: Number(lead.id),
        company: lead.company,
        contact: lead.contact,
        region: lead.region,
        stage: lead.stage,
        probability,
        revenue_potential: Number(lead.revenue_potential),
        owner: lead.owner,
        last_contact: lead.last_contact,
        due_date: lead.due_date,
        due_label: formatDueLabel(lead.due_date),
        action: getActionText(lead.stage as StageName, probability),
        notes: lead.notes ?? null,
        urgencyScore: getUrgencyScore(probability, daysUntilDue),
      };
    })
    .sort((left, right) => {
      const leftStageIndex = STAGES.indexOf(left.stage as StageName);
      const rightStageIndex = STAGES.indexOf(right.stage as StageName);
      if (leftStageIndex !== rightStageIndex) {
        return leftStageIndex - rightStageIndex;
      }

      if (right.urgencyScore !== left.urgencyScore) {
        return right.urgencyScore - left.urgencyScore;
      }

      return right.probability - left.probability;
    });

  const stageCounts = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<StageName, number>;
  const stageValues = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<StageName, number>;
  const ownerBuckets = new Map<string, { won: number; pipe: number; total: number }>();

  let totalPotential = 0;
  let weightedPipeline = 0;
  let averageProbability = 0;
  let overdueDeals = 0;
  let urgentDeals = 0;
  let nextDueLabel = "No open due date";

  const today = getSeoulNow().getTime();
  const dueSorted = [...leads].filter((lead) => lead.stage !== "Contract").sort((left, right) => {
    const leftDue = toSeoulMidnight(left.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightDue = toSeoulMidnight(right.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    return leftDue - rightDue;
  });

  if (dueSorted[0]) {
    nextDueLabel = dueSorted[0].due_label;
  }

  for (const lead of leads) {
    stageCounts[lead.stage as StageName] += 1;
    stageValues[lead.stage as StageName] += lead.revenue_potential;
    totalPotential += lead.revenue_potential;
    averageProbability += lead.probability;

    const dueTime = toSeoulMidnight(lead.due_date)?.getTime();
    const daysUntilDue = dueTime == null ? null : Math.ceil((dueTime - today) / 86_400_000);

    if (lead.stage !== "Contract") {
      weightedPipeline += (lead.revenue_potential * lead.probability) / 100;
      if (daysUntilDue !== null && daysUntilDue < 0) {
        overdueDeals += 1;
      }
      if ((daysUntilDue !== null && daysUntilDue <= 3) || lead.probability < 45) {
        urgentDeals += 1;
      }
    }

    const current = ownerBuckets.get(lead.owner) ?? { won: 0, pipe: 0, total: 0 };
    current.total += 1;
    if (lead.stage === "Contract") {
      current.won += lead.revenue_potential;
    } else {
      current.pipe += (lead.revenue_potential * lead.probability) / 100;
    }
    ownerBuckets.set(lead.owner, current);
  }

  const maxWon = Math.max(...Array.from(ownerBuckets.values()).map((entry) => entry.won), 1);
  const scores = Array.from(ownerBuckets.entries())
    .map(([name, bucket]) => {
      const score = Math.min(
        Math.round((bucket.won / maxWon) * 60 + (bucket.pipe / 5000) * 20 + (bucket.total >= 3 ? 20 : 10)),
        100,
      );

      return {
        name,
        score,
        label: score >= 80 ? "Priority" : score >= 55 ? "Balanced" : "Watch",
        won: bucket.won,
        pipeline: Math.round(bucket.pipe),
        deals: bucket.total,
      };
    })
    .sort((left, right) => right.score - left.score);

  const actions = leads
    .filter((lead) => lead.stage !== "Contract")
    .sort((left, right) => {
      if (right.urgencyScore !== left.urgencyScore) {
        return right.urgencyScore - left.urgencyScore;
      }

      if (right.probability !== left.probability) {
        return left.probability - right.probability;
      }

      return right.revenue_potential - left.revenue_potential;
    })
    .slice(0, 6)
    .map((lead) => ({
      salesRep: lead.owner,
      target: lead.company,
      prob: `${lead.probability}%`,
      action: lead.action,
      due: lead.due_label,
      region: lead.region,
      stage: lead.stage,
    }));

  averageProbability = leads.length > 0 ? Math.round(averageProbability / leads.length) : 0;

  return NextResponse.json({
    backend,
    generatedAt: new Date().toISOString(),
    summary: {
      openDeals: leads.filter((lead) => lead.stage !== "Contract").length,
      wonDeals: leads.filter((lead) => lead.stage === "Contract").length,
      overdueDeals,
      urgentDeals,
      weightedPipeline: Math.round(weightedPipeline),
      totalPotential,
      averageProbability,
      nextDueLabel,
      stageCounts,
      stageValues,
    },
    scores,
    actions,
    leads,
  });
}
