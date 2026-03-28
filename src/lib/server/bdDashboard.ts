import "server-only";

import {
  getCurrentFiscalQuarterLabel,
  getCurrentFiscalQuarterMonths,
} from "@/lib/fiscalCalendar";
import { getMultipleSheetValues } from "@/lib/server/googleSheets";
import type {
  ActivityStage,
  DashboardDataSource,
  DashboardPayload,
  DealAgingPoint,
  FocusAccount,
  HotDeal,
  IndividualData,
  IndividualKpi,
  RegionData,
  RevenuePacingPoint,
  Stat,
  TeamSummary,
} from "@/types/dashboard";

const SEG_RANGE = "2. SEG!A1:S40";
const REV_RANGE = "3. REV!A1:CZ400";
const KPI_RANGE = "4. L-KPI!A1:AZ60";

const ACTIVITY_KEYS = ["LD", "ACC", "OPP", "SOL", "VST"] as const;
const ACTIVITY_LABELS: Record<(typeof ACTIVITY_KEYS)[number], string> = {
  LD: "Lead",
  ACC: "Account",
  OPP: "Opportunity",
  SOL: "Solution",
  VST: "Visit",
};

const REGION_COORDINATES: Record<string, [number, number]> = {
  서울: [170, 88],
  인천: [128, 100],
  경기: [192, 118],
  강원: [262, 86],
  대전: [168, 184],
  충북: [146, 194],
  충남: [126, 212],
  세종: [154, 178],
  광주: [130, 282],
  전북: [120, 302],
  전남: [112, 330],
  대구: [238, 228],
  경북: [258, 178],
  경남: [230, 292],
  부산: [268, 312],
  울산: [280, 272],
  제주: [155, 422],
};

const MAP_VISIBLE_REGIONS = new Set(Object.keys(REGION_COORDINATES));

type ActivityKey = (typeof ACTIVITY_KEYS)[number];

interface RevenueRow {
  id: string;
  account: string;
  team: string;
  manager: string;
  type: string;
  status: string;
  firstPayment: string | null;
  version: string;
  location: string;
  importance: string;
  remark: string;
  amount: number;
  probability: number;
  monthTotals: Record<number, number>;
}

interface ActivitySnapshot {
  goal: Record<ActivityKey, number>;
  actual: Record<ActivityKey, number>;
}

interface SheetRanges {
  [SEG_RANGE]: string[][];
  [REV_RANGE]: string[][];
  [KPI_RANGE]: string[][];
}

let cache: { expiresAt: number; data: DashboardPayload } | null = null;

function padRow(row: string[], minLength: number): string[] {
  if (row.length >= minLength) {
    return row;
  }

  return [...row, ...Array.from({ length: minLength - row.length }, () => "")];
}

function parseNumber(value: string | undefined): number {
  const normalized = (value ?? "").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string | undefined): string | null {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized === "-") {
    return null;
  }

  return normalized;
}

function getRegionStatus(progress: number): RegionData["status"] {
  if (progress >= 95) {
    return "good";
  }

  if (progress >= 75) {
    return "warning";
  }

  return "critical";
}

function formatCompactRevenue(amount: number): string {
  if (amount >= 1000) {
    return `KRW ${(amount / 1000).toFixed(1)}B`;
  }

  return `KRW ${Math.round(amount).toLocaleString()}M`;
}

function getImportanceWeight(value: string): number {
  if (value === "KA") {
    return 3;
  }

  if (value === "A") {
    return 2;
  }

  if (value === "B") {
    return 1;
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function deriveProbability(row: Pick<RevenueRow, "status" | "importance" | "type" | "firstPayment">): number {
  if (row.firstPayment) {
    return 100;
  }

  let score = row.status === "Renew" ? 72 : 58;

  if (row.importance === "KA") {
    score += 18;
  } else if (row.importance === "A") {
    score += 10;
  } else if (row.importance === "B") {
    score += 4;
  }

  if (row.type === "Channel") {
    score -= 4;
  }

  return clamp(score, 20, 95);
}

function getMonthColumns(headerRow: string[]): Array<{ month: number; index: number }> {
  return headerRow
    .map((cell, index) => ({ raw: (cell ?? "").trim(), index }))
    .filter(({ raw }) => /^\d{1,2}$/.test(raw))
    .map(({ raw, index }) => ({ month: Number(raw), index }))
    .filter(({ month }) => month >= 1 && month <= 12);
}

function parseSegRows(rows: string[][]): {
  totalTarget: number;
  totalRevenue: number;
  regional: RegionData[];
} {
  const regionMap = new Map<string, { target: number; revenue: number }>();

  for (const sourceRow of rows.slice(3)) {
    const row = padRow(sourceRow, 19);
    const goalLocation = row[11]?.trim();
    const goalRevenue = parseNumber(row[12]);
    const statusLocation = row[16]?.trim();
    const statusRevenue = parseNumber(row[17]);

    if (goalLocation) {
      const current = regionMap.get(goalLocation) ?? { target: 0, revenue: 0 };
      current.target = goalRevenue;
      regionMap.set(goalLocation, current);
    }

    if (statusLocation) {
      const current = regionMap.get(statusLocation) ?? { target: 0, revenue: 0 };
      current.revenue = statusRevenue;
      regionMap.set(statusLocation, current);
    }
  }

  const allRegions = Array.from(regionMap.entries()).map(([name, values]) => ({
    name,
    ...values,
  }));

  const regional = allRegions
    .filter((row) => MAP_VISIBLE_REGIONS.has(row.name))
    .map((row) => {
      const progress = row.target > 0 ? Math.round((row.revenue / row.target) * 100) : 0;

      return {
        name: row.name,
        revenue: row.revenue,
        target: row.target,
        progress,
        deals_active: 0,
        deals_closed: 0,
        velocity: 0,
        status: getRegionStatus(progress),
        coordinates: REGION_COORDINATES[row.name],
      } satisfies RegionData;
    })
    .sort((left, right) => right.revenue - left.revenue);

  return {
    totalTarget: allRegions.reduce((sum, row) => sum + row.target, 0),
    totalRevenue: allRegions.reduce((sum, row) => sum + row.revenue, 0),
    regional,
  };
}

function parseRevenueRows(rows: string[][]): RevenueRow[] {
  const headerRow = rows[1] ?? [];
  const monthColumns = getMonthColumns(headerRow);

  return rows
    .slice(2)
    .map((sourceRow) => padRow(sourceRow, headerRow.length))
    .filter((row) => row[0]?.trim())
    .map((row, index) => {
      const monthTotals = Object.fromEntries(
        monthColumns.map(({ month, index: columnIndex }) => [month, parseNumber(row[columnIndex])]),
      );

      const revenueRow: RevenueRow = {
        id: `acct-${index}-${row[0]?.trim() ?? "unknown"}`,
        account: row[0].trim(),
        team: row[2]?.trim() ?? "",
        manager: row[3]?.trim() ?? "",
        type: row[4]?.trim() ?? "",
        status: row[5]?.trim() ?? "",
        firstPayment: parseDate(row[6]),
        version: row[7]?.trim() ?? "",
        location: row[8]?.trim() ?? "",
        importance: row[10]?.trim() ?? "",
        remark: row[11]?.trim() ?? "",
        amount: parseNumber(row[12]),
        probability: 0,
        monthTotals,
      };

      return {
        ...revenueRow,
        probability: deriveProbability(revenueRow),
      };
    })
    .filter((row) => row.team === "BD" && Boolean(row.manager));
}

function parseKpiRows(rows: string[][]): Record<string, ActivitySnapshot> {
  const members: Record<string, ActivitySnapshot> = {};

  for (const sourceRow of rows.slice(2)) {
    const row = padRow(sourceRow, 26);
    const name = row[0]?.trim();

    if (!name) {
      break;
    }

    members[name] = {
      goal: {
        LD: parseNumber(row[1]),
        ACC: parseNumber(row[2]),
        OPP: parseNumber(row[3]),
        SOL: parseNumber(row[4]),
        VST: parseNumber(row[5]),
      },
      actual: {
        LD: parseNumber(row[21]),
        ACC: parseNumber(row[22]),
        OPP: parseNumber(row[23]),
        SOL: parseNumber(row[24]),
        VST: parseNumber(row[25]),
      },
    };
  }

  return members;
}

function buildFocusAccount(row: RevenueRow): FocusAccount {
  return {
    id: row.id,
    name: row.account,
    manager: row.manager,
    region: row.location,
    type: row.type,
    status: row.status,
    version: row.version,
    amount: row.amount,
    firstPayment: row.firstPayment,
    remark: row.remark,
    importance: row.importance,
    probability: row.probability,
    monthTotals: row.monthTotals,
  };
}

function buildStats(summary: TeamSummary, activityStages: ActivityStage[]): Stat[] {
  const nextExecution = activityStages
    .slice()
    .sort((left, right) => (left.progress ?? 0) - (right.progress ?? 0))[0];

  return [
    {
      label: "BD Revenue",
      value: formatCompactRevenue(summary.actualRevenue),
      trend: `${summary.attainment.toFixed(1)}% of ${formatCompactRevenue(summary.targetRevenue)}`,
      trendType: summary.attainment >= 100 ? "up" : summary.attainment >= 80 ? "down" : "critical",
      trendLabel: "vs Target",
    },
    {
      label: "Goal Gap",
      value: summary.gapRevenue > 0 ? formatCompactRevenue(summary.gapRevenue) : "On Plan",
      trend: summary.gapRevenue > 0 ? `Need ${formatCompactRevenue(summary.gapRevenue)} more` : "Target already covered",
      trendType: summary.gapRevenue > 0 ? "down" : "up",
      trendLabel: "Gap",
    },
    {
      label: "Active Accounts",
      value: String(summary.accountCount),
      trend: `${summary.activatedCount} with first payment`,
      trendType: summary.activatedCount >= Math.ceil(summary.accountCount * 0.5) ? "up" : "down",
      trendLabel: "Activation",
    },
    {
      label: "Execution KPI",
      value: `${summary.activityCompletion.toFixed(1)}%`,
      trend: nextExecution
        ? `${nextExecution.stage} ${nextExecution.actual ?? 0}/${nextExecution.goal ?? nextExecution.fullMark}`
        : "No KPI goals",
      trendType:
        summary.activityCompletion >= 60 ? "up" : summary.activityCompletion >= 30 ? "down" : "critical",
      trendLabel: "Activity",
    },
  ];
}

function daysSince(dateValue: string | null, reference: Date): number {
  if (!dateValue) {
    return 0;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((reference.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function buildFallbackPacing(totalTarget: number): RevenuePacingPoint[] {
  const quarterMonths = getCurrentFiscalQuarterMonths();
  const baseTarget = totalTarget > 0 ? totalTarget / quarterMonths.length : 120;
  const factors = [0.52, 0.74, 0.89];

  return quarterMonths.map((month, index) => {
    const cumulativeTarget = Math.round(baseTarget * (index + 1));
    return {
      label: `${month}월 -더미-`,
      month,
      actual: Math.round(cumulativeTarget * factors[index]),
      target: cumulativeTarget,
      isDummy: true,
    };
  });
}

function buildPacingData(revenueRows: RevenueRow[], totalTarget: number): RevenuePacingPoint[] {
  const quarterMonths = getCurrentFiscalQuarterMonths();
  const actualByMonth = quarterMonths.map((month) =>
    revenueRows.reduce((sum, row) => sum + (row.monthTotals[month] ?? 0), 0),
  );

  if (actualByMonth.every((value) => value <= 0)) {
    return buildFallbackPacing(totalTarget);
  }

  const linearMonthlyTarget = totalTarget > 0 ? totalTarget / quarterMonths.length : 0;
  let runningActual = 0;

  return quarterMonths.map((month, index) => {
    runningActual += actualByMonth[index] ?? 0;

    return {
      label: `${month}월`,
      month,
      actual: runningActual,
      target: Math.round(linearMonthlyTarget * (index + 1)),
    };
  });
}

function buildAgingData(revenueRows: RevenueRow[]): DealAgingPoint[] {
  const now = new Date();
  const livePoints = revenueRows
    .filter((row) => row.firstPayment)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 7)
    .map((row) => ({
      id: row.id,
      name: row.account,
      stage: row.status || "Activated",
      days: daysSince(row.firstPayment, now),
      value: row.amount,
      prob: row.probability,
    }));

  if (livePoints.length >= 3) {
    return livePoints;
  }

  const dummyPoints: DealAgingPoint[] = [
    { id: "aging-dummy-1", name: "Activation slot -더미-", stage: "Lead", days: 16, value: 120, prob: 55, isDummy: true },
    { id: "aging-dummy-2", name: "Activation slot -더미-", stage: "Proposal", days: 32, value: 180, prob: 62, isDummy: true },
    { id: "aging-dummy-3", name: "Activation slot -더미-", stage: "Negotiation", days: 49, value: 260, prob: 78, isDummy: true },
  ];

  return [...livePoints, ...dummyPoints].slice(0, 3);
}

function buildHotDeals(accounts: FocusAccount[]): HotDeal[] {
  return accounts.slice(0, 5).map((account) => ({
    id: account.id,
    client: account.name,
    manager: account.manager,
    region: account.region,
    version: account.version,
    value: account.amount,
    probability: account.probability,
    note: account.firstPayment
      ? `First payment ${account.firstPayment}`
      : `${account.manager} · ${account.region} · ${account.type}`,
    status: account.probability >= 80 ? "urgent" : "normal",
    isDummy: account.isDummy,
  }));
}

function buildMinimalFallbackDashboard(): DashboardPayload {
  const regional: RegionData[] = [
    {
      name: "서울",
      revenue: 380,
      target: 520,
      progress: 73,
      deals_active: 4,
      deals_closed: 2,
      velocity: 50,
      status: "warning",
      coordinates: REGION_COORDINATES.서울,
      isDummy: true,
    },
    {
      name: "경기",
      revenue: 340,
      target: 500,
      progress: 68,
      deals_active: 3,
      deals_closed: 1,
      velocity: 33,
      status: "critical",
      coordinates: REGION_COORDINATES.경기,
      isDummy: true,
    },
    {
      name: "부산",
      revenue: 290,
      target: 360,
      progress: 81,
      deals_active: 3,
      deals_closed: 2,
      velocity: 67,
      status: "warning",
      coordinates: REGION_COORDINATES.부산,
      isDummy: true,
    },
  ];

  const individuals: IndividualData[] = [
    {
      name: "Han -더미-",
      wonRevenue: 410,
      pipelineRevenue: 140,
      target: 460,
      progress: 89,
      deals_total: 4,
      deals_won: 2,
      isDummy: true,
    },
    {
      name: "Wangchan -더미-",
      wonRevenue: 320,
      pipelineRevenue: 180,
      target: 460,
      progress: 70,
      deals_total: 4,
      deals_won: 1,
      isDummy: true,
    },
    {
      name: "Junhyuk -더미-",
      wonRevenue: 280,
      pipelineRevenue: 210,
      target: 460,
      progress: 61,
      deals_total: 3,
      deals_won: 1,
      isDummy: true,
    },
  ];

  const bottleneck: ActivityStage[] = [
    { stage: "Lead", value: 12, fullMark: 18, goal: 18, actual: 12, progress: 67, isDummy: true },
    { stage: "Account", value: 8, fullMark: 12, goal: 12, actual: 8, progress: 67, isDummy: true },
    { stage: "Opportunity", value: 5, fullMark: 10, goal: 10, actual: 5, progress: 50, isDummy: true },
  ];

  const focusAccounts: FocusAccount[] = [
    {
      id: "dummy-acct-1",
      name: "서울 교육그룹 -더미-",
      manager: "Han",
      region: "서울",
      type: "Direct",
      status: "New",
      version: "Hardware",
      amount: 220,
      firstPayment: null,
      remark: "Fallback account",
      importance: "KA",
      probability: 82,
      isDummy: true,
    },
    {
      id: "dummy-acct-2",
      name: "경기 러닝랩 -더미-",
      manager: "Wangchan",
      region: "경기",
      type: "Channel",
      status: "Renew",
      version: "Subscription",
      amount: 180,
      firstPayment: "2026-03-10",
      remark: "Fallback account",
      importance: "A",
      probability: 76,
      isDummy: true,
    },
    {
      id: "dummy-acct-3",
      name: "부산 캠퍼스 -더미-",
      manager: "Junhyuk",
      region: "부산",
      type: "Direct",
      status: "New",
      version: "Hardware",
      amount: 160,
      firstPayment: null,
      remark: "Fallback account",
      importance: "B",
      probability: 68,
      isDummy: true,
    },
  ];

  const teamSummary: TeamSummary = {
    targetRevenue: 1380,
    actualRevenue: 1010,
    gapRevenue: 370,
    attainment: 73.2,
    accountCount: 11,
    activatedCount: 4,
    newRevenue: 620,
    renewRevenue: 390,
    directRevenue: 650,
    channelRevenue: 360,
    activityGoal: 40,
    activityActual: 25,
    activityCompletion: 62.5,
    topManager: individuals[0]?.name ?? "BD -더미-",
    criticalRegionCount: 1,
  };

  return {
    stats: buildStats(teamSummary, bottleneck),
    regional,
    bottleneck,
    individuals,
    focusAccounts,
    topAccounts: focusAccounts,
    hotDeals: buildHotDeals(focusAccounts),
    teamSummary,
    pacing: buildFallbackPacing(teamSummary.targetRevenue),
    aging: buildAgingData([]),
    periodLabel: `${getCurrentFiscalQuarterLabel()} · BD Team`,
    dataSource: "fallback",
    lastUpdated: new Date().toISOString(),
  };
}

function buildDashboardFromRanges(sheetRows: SheetRanges, dataSource: DashboardDataSource): DashboardPayload {
  const { totalTarget, totalRevenue, regional } = parseSegRows(sheetRows[SEG_RANGE]);
  const revenueRows = parseRevenueRows(sheetRows[REV_RANGE]);
  const kpiByMember = parseKpiRows(sheetRows[KPI_RANGE]);

  if (regional.length === 0 || revenueRows.length === 0) {
    return buildMinimalFallbackDashboard();
  }

  const regionAccountCount = new Map<string, { total: number; activated: number }>();
  for (const row of revenueRows) {
    const current = regionAccountCount.get(row.location) ?? { total: 0, activated: 0 };
    current.total += 1;
    current.activated += row.firstPayment ? 1 : 0;
    regionAccountCount.set(row.location, current);
  }

  const regionalWithCounts = regional.map((row) => {
    const counts = regionAccountCount.get(row.name) ?? { total: 0, activated: 0 };
    const velocity = counts.total > 0 ? Math.round((counts.activated / counts.total) * 100) : 0;

    return {
      ...row,
      deals_active: counts.total,
      deals_closed: counts.activated,
      velocity,
    };
  });

  const managerNames = Array.from(
    new Set([
      ...revenueRows.map((row) => row.manager).filter(Boolean),
      ...Object.keys(kpiByMember),
    ]),
  );
  const equalTarget = managerNames.length > 0 ? Math.round(totalTarget / managerNames.length) : 0;

  const individuals: IndividualData[] = managerNames
    .map((manager) => {
      const ownedRows = revenueRows.filter((row) => row.manager === manager);
      const activity = kpiByMember[manager] ?? {
        goal: { LD: 0, ACC: 0, OPP: 0, SOL: 0, VST: 0 },
        actual: { LD: 0, ACC: 0, OPP: 0, SOL: 0, VST: 0 },
      };

      const wonRevenue = ownedRows.reduce((sum, row) => sum + row.amount, 0);
      const newRevenue = ownedRows
        .filter((row) => row.status === "New")
        .reduce((sum, row) => sum + row.amount, 0);
      const renewRevenue = ownedRows
        .filter((row) => row.status === "Renew")
        .reduce((sum, row) => sum + row.amount, 0);
      const dealsTotal = ownedRows.length;
      const dealsWon = ownedRows.filter((row) => row.firstPayment).length;
      const kpis: IndividualKpi[] = ACTIVITY_KEYS.map((key) => ({
        key,
        label: ACTIVITY_LABELS[key],
        goal: activity.goal[key],
        actual: activity.actual[key],
        progress: activity.goal[key] > 0 ? Math.round((activity.actual[key] / activity.goal[key]) * 100) : 0,
      }));
      const activityGoal = kpis.reduce((sum, kpi) => sum + kpi.goal, 0);
      const activityActual = kpis.reduce((sum, kpi) => sum + kpi.actual, 0);

      return {
        name: manager,
        wonRevenue,
        pipelineRevenue: ownedRows
          .filter((row) => !row.firstPayment)
          .reduce((sum, row) => sum + Math.round(row.amount * (row.probability / 100)), 0),
        target: equalTarget,
        progress: equalTarget > 0 ? Math.round((wonRevenue / equalTarget) * 100) : 0,
        deals_total: dealsTotal,
        deals_won: dealsWon,
        newRevenue,
        renewRevenue,
        activityGoal,
        activityActual,
        kpis,
      };
    })
    .sort((left, right) => right.wonRevenue - left.wonRevenue);

  const activitySummary: ActivityStage[] = ACTIVITY_KEYS.map((key) => {
    const goal = individuals.reduce((sum, person) => {
      const metric = person.kpis?.find((item) => item.key === key);
      return sum + (metric?.goal ?? 0);
    }, 0);

    const actual = individuals.reduce((sum, person) => {
      const metric = person.kpis?.find((item) => item.key === key);
      return sum + (metric?.actual ?? 0);
    }, 0);

    return {
      stage: ACTIVITY_LABELS[key],
      value: actual,
      fullMark: goal,
      goal,
      actual,
      progress: goal > 0 ? Math.round((actual / goal) * 100) : 0,
    };
  });

  const activatedCount = revenueRows.filter((row) => row.firstPayment).length;
  const newRevenue = revenueRows
    .filter((row) => row.status === "New")
    .reduce((sum, row) => sum + row.amount, 0);
  const renewRevenue = revenueRows
    .filter((row) => row.status === "Renew")
    .reduce((sum, row) => sum + row.amount, 0);
  const directRevenue = revenueRows
    .filter((row) => row.type === "Direct")
    .reduce((sum, row) => sum + row.amount, 0);
  const channelRevenue = revenueRows
    .filter((row) => row.type === "Channel")
    .reduce((sum, row) => sum + row.amount, 0);
  const activityGoal = activitySummary.reduce((sum, item) => sum + (item.goal ?? item.fullMark), 0);
  const activityActual = activitySummary.reduce((sum, item) => sum + (item.actual ?? item.value), 0);
  const attainment = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;

  const teamSummary: TeamSummary = {
    targetRevenue: totalTarget,
    actualRevenue: totalRevenue,
    gapRevenue: Math.max(totalTarget - totalRevenue, 0),
    attainment,
    accountCount: revenueRows.length,
    activatedCount,
    newRevenue,
    renewRevenue,
    directRevenue,
    channelRevenue,
    activityGoal,
    activityActual,
    activityCompletion: activityGoal > 0 ? (activityActual / activityGoal) * 100 : 0,
    topManager: individuals[0]?.name ?? "BD",
    criticalRegionCount: regionalWithCounts.filter((row) => row.progress < 80).length,
  };

  const focusAccounts = revenueRows
    .slice()
    .sort((left, right) => {
      const importanceDiff = getImportanceWeight(right.importance) - getImportanceWeight(left.importance);
      if (importanceDiff !== 0) {
        return importanceDiff;
      }

      if (Boolean(left.firstPayment) !== Boolean(right.firstPayment)) {
        return left.firstPayment ? 1 : -1;
      }

      return right.amount - left.amount;
    })
    .slice(0, 6)
    .map(buildFocusAccount);

  const topAccounts = revenueRows
    .slice()
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6)
    .map(buildFocusAccount);

  return {
    stats: buildStats(teamSummary, activitySummary),
    regional: regionalWithCounts,
    bottleneck: activitySummary,
    individuals,
    focusAccounts,
    topAccounts,
    hotDeals: buildHotDeals(focusAccounts),
    teamSummary,
    pacing: buildPacingData(revenueRows, totalTarget),
    aging: buildAgingData(revenueRows),
    periodLabel: `${getCurrentFiscalQuarterLabel()} · BD Team`,
    dataSource,
    lastUpdated: new Date().toISOString(),
  };
}

async function loadLiveDashboard(): Promise<DashboardPayload> {
  const values = await getMultipleSheetValues([SEG_RANGE, REV_RANGE, KPI_RANGE]);

  const sheetRanges: SheetRanges = {
    [SEG_RANGE]: values[SEG_RANGE] ?? [],
    [REV_RANGE]: values[REV_RANGE] ?? [],
    [KPI_RANGE]: values[KPI_RANGE] ?? [],
  };

  return buildDashboardFromRanges(sheetRanges, "google-sheets");
}

export async function getBdDashboardData(): Promise<DashboardPayload> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  try {
    const liveData = await loadLiveDashboard();
    cache = {
      data: liveData,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    return liveData;
  } catch (error) {
    console.error("Failed to load BD dashboard from Google Sheets:", error);

    const fallback = buildMinimalFallbackDashboard();
    cache = {
      data: fallback,
      expiresAt: Date.now() + 60 * 1000,
    };
    return fallback;
  }
}
