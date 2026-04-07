import { NextResponse } from "next/server";
import { listLeads, createLead } from "@/lib/server/salesData";

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

function getActionText(stage: StageName, dealType: string | null | undefined, productType: string | null | undefined, importance: string | null | undefined): string {
  const isRenew = dealType === "Renew";
  const isHardware = productType === "Hardware";
  const isKA = importance === "KA";

  if (stage === "Negotiation") {
    if (isRenew) return "갱신 조건 최종 확인, 결정권자 확보, 계약서 서명 일정 잡기.";
    return isKA
      ? "핵심 계정 — 상업 조건 고정, 결정권자 확인 후 서명 진행."
      : "상업 조건 확정, 결정권자 확인, 서명 일정 확보.";
  }

  if (stage === "Proposal") {
    if (isRenew) return "갱신 가치 재확인, 기존 사용 실적 제시, 다음 미팅 캘린더 등록.";
    if (isHardware) return "하드웨어 스펙 및 설치 일정 구체화, 승인 경로 단순화.";
    return isKA
      ? "핵심 계정 — 가치 케이스 강화, 다음 검토 세션 확정."
      : "제안 범위 구체화, 다음 미팅 캘린더 등록.";
  }

  if (stage === "Lead") {
    return "적격성 확인 후 제안 단계로 전환.";
  }

  return "다음 단계로 딜 진행.";
}

function getUrgencyScore(
  probability: number,
  daysUntilDue: number | null,
  dealType: string | null | undefined,
  importance: string | null | undefined,
  revenuePotenital: number,
): number {
  const duePressure = daysUntilDue === null ? 0 : daysUntilDue < 0 ? 40 : daysUntilDue <= 3 ? 25 : daysUntilDue <= 7 ? 10 : 0;
  const probabilityPressure = Math.max(0, 65 - probability);
  const renewBonus = dealType === "Renew" ? 10 : 0;
  const importanceBonus = importance === "KA" ? 15 : importance === "A" ? 8 : 0;
  const valueBonus = revenuePotenital >= 100_000 ? 10 : revenuePotenital >= 30_000 ? 5 : 0;
  return Math.min(100, probabilityPressure + duePressure + renewBonus + importanceBonus + valueBonus);
}

export async function GET() {
  const { backend, rows } = await listLeads();

  const leads = rows
    .map((lead) => {
      const probability = Number(lead.probability);
      const daysUntilDue = getDaysUntilDue(lead.due_date);

      const revenue_potential = Number(lead.revenue_potential);
      return {
        id: Number(lead.id),
        company: lead.company,
        contact: lead.contact,
        region: lead.region,
        stage: lead.stage,
        probability,
        revenue_potential,
        owner: lead.owner,
        last_contact: lead.last_contact,
        due_date: lead.due_date,
        due_label: formatDueLabel(lead.due_date),
        action: getActionText(lead.stage as StageName, lead.deal_type, lead.product_type, lead.importance),
        notes: lead.notes ?? null,
        deal_type: lead.deal_type ?? null,
        product_type: lead.product_type ?? null,
        importance: lead.importance ?? null,
        urgencyScore: getUrgencyScore(probability, daysUntilDue, lead.deal_type, lead.importance, revenue_potential),
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
  let newPipeline = 0;
  let renewPipeline = 0;
  let newDeals = 0;
  let renewDeals = 0;
  let newWon = 0;
  let renewWon = 0;

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

    if (lead.deal_type === "Renew") {
      renewDeals += 1;
      if (lead.stage === "Contract") renewWon += lead.revenue_potential;
    } else {
      newDeals += 1;
      if (lead.stage === "Contract") newWon += lead.revenue_potential;
    }

    if (lead.stage !== "Contract") {
      const weighted = (lead.revenue_potential * lead.probability) / 100;
      weightedPipeline += weighted;

      if (lead.deal_type === "Renew") {
        renewPipeline += weighted;
      } else {
        newPipeline += weighted;
      }

      if (daysUntilDue !== null && daysUntilDue < 0) {
        overdueDeals += 1;
      }
      if ((daysUntilDue !== null && daysUntilDue <= 3) || lead.urgencyScore >= 15) {
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
  const maxPipe = Math.max(...Array.from(ownerBuckets.values()).map((entry) => entry.pipe), 1);
  const scores = Array.from(ownerBuckets.entries())
    .map(([name, bucket]) => {
      const score = Math.min(
        Math.round((bucket.won / maxWon) * 55 + (bucket.pipe / maxPipe) * 30 + (bucket.total >= 3 ? 15 : 7)),
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
    .slice(0, 10)
    .map((lead) => ({
      salesRep: lead.owner,
      target: lead.company,
      prob: `${lead.probability}%`,
      action: lead.action,
      due: lead.due_label,
      region: lead.region,
      stage: lead.stage,
      deal_type: lead.deal_type ?? null,
      product_type: lead.product_type ?? null,
      importance: lead.importance ?? null,
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
      newPipeline: Math.round(newPipeline),
      renewPipeline: Math.round(renewPipeline),
      newDeals,
      renewDeals,
      newWon,
      renewWon,
    },
    scores,
    actions,
    leads,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company, contact, region, stage, probability, revenue_potential, owner, last_contact, due_date, notes, deal_type, product_type, importance } = body;

    if (!company || !stage) {
      return NextResponse.json({ error: 'company and stage are required' }, { status: 400 });
    }

    if (!(STAGES as readonly string[]).includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const result = await createLead({
      company: String(company),
      contact: String(contact ?? ''),
      region: String(region ?? ''),
      stage: String(stage),
      probability: Number(probability ?? 50),
      revenue_potential: Number(revenue_potential ?? 0),
      owner: String(owner ?? ''),
      last_contact: String(last_contact ?? ''),
      due_date: String(due_date ?? ''),
      notes: notes ? String(notes) : null,
      deal_type: deal_type ?? null,
      product_type: product_type ? String(product_type) : null,
      importance: importance ? String(importance) : null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
