import "server-only";

import {
  getFiscalCalendarInfo,
  getCurrentFiscalQuarterLabel,
  getCurrentFiscalQuarterMonths,
} from "@/lib/fiscalCalendar";
import type { FiscalQuarter } from "@/lib/fiscalCalendar";
import {
  getMultipleSheetValues,
  hasGoogleSheetsConfig,
} from "@/lib/server/googleSheets";
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

const TARGET_MANAGERS = ["han", "wangchan", "junhyuk"] as const;
const DSH_RANGE = "1. DSH!A1:V200";
const SEG_RANGE = "2. SEG!A1:S40";
const REV_RANGE = "3. REV!A1:CZ400";
const KPI_RANGE = "4. KPI!A1:AZ60";

// DSH sheet column indices
// Col 0: Team, Col 1: Type, Col 2: Product, Col 3: Manager, Col 4: Goal/Status
// Col 5: Year, Col 6: Q1, Col 7: Q2, Col 8: Q3, Col 9: Q4
// Col 10-21: months Apr(4)→Mar(3)
const DSH_YEAR_COL = 5;
const DSH_QUARTER_COLS: Record<number, number> = { 1: 6, 2: 7, 3: 8, 4: 9 };
const DSH_FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3] as const;

const LIVE_CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 60 * 1000;

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

interface ManagerBucket {
  wonRevenue: number;
  pipelineRevenue: number;
  newRevenue: number;
  renewRevenue: number;
  dealsTotal: number;
  dealsWon: number;
}

interface DshManagerTarget {
  yearlyTarget: number;
  quarterlyTarget: number;
  monthlyTargets: Record<number, number>;
}

interface DshManagerActual {
  yearlyActual: number;
  quarterlyActual: number;
  monthlyActuals: Record<number, number>;
}

interface DshTargets {
  bdYearlyTarget: number;
  bdQuarterlyTarget: number;
  bdMonthlyTargets: Record<number, number>;
  bdMonthlyActuals: Record<number, number>;
  managerTargets: Record<string, DshManagerTarget>;
  bdYearlyActual: number;
  bdQuarterlyActual: number;
  managerActuals: Record<string, DshManagerActual>;
}

interface SheetRanges {
  [DSH_RANGE]: string[][];
  [SEG_RANGE]: string[][];
  [REV_RANGE]: string[][];
  [KPI_RANGE]: string[][];
}

interface DashboardCacheEntry {
  expiresAt: number;
  data: DashboardPayload;
}

interface RevenueSummary {
  managerBuckets: Map<string, ManagerBucket>;
  regionCounts: Map<string, { total: number; activated: number }>;
  regionRevenue: Map<string, number>; // confirmed (firstPayment) revenue per region
  monthlyActuals: Map<number, number>;
  activatedCount: number;
  newRevenue: number;
  renewRevenue: number;
  directRevenue: number;
  channelRevenue: number;
  yearlyActual: number;
}

let cache: DashboardCacheEntry | null = null;
let inflightDashboard: Promise<DashboardPayload> | null = null;

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

function parseDshSheet(rows: string[][], fiscalQuarter: FiscalQuarter): DshTargets {
  const qCol = DSH_QUARTER_COLS[fiscalQuarter] ?? 6;
  const result: DshTargets = {
    bdYearlyTarget: 0,
    bdQuarterlyTarget: 0,
    bdMonthlyTargets: {},
    bdMonthlyActuals: {},
    managerTargets: {},
    bdYearlyActual: 0,
    bdQuarterlyActual: 0,
    managerActuals: {},
  };

  // ── Upper summary section (rows 0-24) ──────────────────────────
  // The DSH sheet has three side-by-side sections in the top rows:
  //   Goal (A-F) | Fixed Goal (H-P) | Status (R-Z)
  // Column I (8) = Fixed Goal Sum, Column S (18) = Status Sum
  // Row labels are in col A: "Sum", "Han", "Wangchan", "Junhyuk", etc.
  const FIXED_GOAL_SUM_COL = 8;   // col I
  const STATUS_SUM_COL = 18;       // col S

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = padRow(rows[i], 22);
    const label = row[0]?.trim().toLowerCase();

    if (!label || label === "fy26-27" || label === "fy25-26" || label === "goal") {
      continue;
    }

    // Quarter-specific rows start with a digit ("4" for Q4)
    if (/^\d$/.test(row[0]?.trim())) {
      continue;
    }

    const fixedGoalSum = parseNumber(row[FIXED_GOAL_SUM_COL]);
    const statusSum = parseNumber(row[STATUS_SUM_COL]);

    if (label === "sum") {
      // Team-level Status (actual revenue) from upper section
      if (result.bdYearlyActual === 0 && statusSum > 0) {
        result.bdYearlyActual = statusSum;
        result.bdQuarterlyActual = statusSum;
      }
      continue;
    }

    // Individual manager Status from upper section
    if ((TARGET_MANAGERS as readonly string[]).includes(label)) {
      if (!result.managerActuals[label]) {
        result.managerActuals[label] = { yearlyActual: statusSum, quarterlyActual: statusSum, monthlyActuals: {} };
      }
    }
  }

  // ── Detailed section (rows 25+) ────────────────────────────────
  // Each manager has a block with two "Total" rows in col B:
  //   1st Total = Goal Total (F=Year, G-J=Q1-Q4, K-V=Monthly)
  //   2nd Total = Status Total
  // Manager name appears in col A at the start of each block.
  let currentManager = "";
  let totalCountForManager = 0;

  for (let i = 25; i < rows.length; i++) {
    const row = padRow(rows[i], 22);
    const colA = row[0]?.trim();
    const colB = row[1]?.trim();

    // Detect new manager section (non-empty col A with a recognized name)
    if (colA) {
      const normalized = colA.toLowerCase();
      if ((TARGET_MANAGERS as readonly string[]).includes(normalized)) {
        currentManager = normalized;
        totalCountForManager = 0;
      } else if (normalized === "bd" || normalized === "sum" || normalized === "total") {
        // BD team-level section
        currentManager = "__bd__";
        totalCountForManager = 0;
      }
    }

    // Process "Total" rows
    if (colB === "Total") {
      totalCountForManager++;
      const yearValue = parseNumber(row[DSH_YEAR_COL]);
      const quarterValue = parseNumber(row[qCol]);

      if (currentManager === "__bd__") {
        if (totalCountForManager === 1) {
          result.bdYearlyTarget = yearValue;
          result.bdQuarterlyTarget = quarterValue;
          DSH_FISCAL_MONTHS.forEach((month, idx) => {
            result.bdMonthlyTargets[month] = parseNumber(row[10 + idx]);
          });
        } else if (totalCountForManager === 2) {
          result.bdYearlyActual = yearValue;
          result.bdQuarterlyActual = quarterValue;
          DSH_FISCAL_MONTHS.forEach((month, idx) => {
            result.bdMonthlyActuals[month] = parseNumber(row[10 + idx]);
          });
        }
      } else if ((TARGET_MANAGERS as readonly string[]).includes(currentManager)) {
        if (totalCountForManager === 1) {
          const monthlyTargets: Record<number, number> = {};
          DSH_FISCAL_MONTHS.forEach((month, idx) => {
            monthlyTargets[month] = parseNumber(row[10 + idx]);
          });
          result.managerTargets[currentManager] = {
            yearlyTarget: yearValue,
            quarterlyTarget: quarterValue,
            monthlyTargets,
          };
        } else if (totalCountForManager === 2) {
          const monthlyActuals: Record<number, number> = {};
          DSH_FISCAL_MONTHS.forEach((month, idx) => {
            monthlyActuals[month] = parseNumber(row[10 + idx]);
          });
          result.managerActuals[currentManager] = {
            yearlyActual: yearValue,
            quarterlyActual: quarterValue,
            monthlyActuals,
          };
        }
      }
    }
  }

  // If no BD-level row was found, sum manager targets/actuals
  if (result.bdQuarterlyTarget === 0) {
    for (const mgr of Object.values(result.managerTargets)) {
      result.bdYearlyTarget += mgr.yearlyTarget;
      result.bdQuarterlyTarget += mgr.quarterlyTarget;
      DSH_FISCAL_MONTHS.forEach((month) => {
        result.bdMonthlyTargets[month] = (result.bdMonthlyTargets[month] ?? 0) + (mgr.monthlyTargets[month] ?? 0);
      });
    }
  }

  if (result.bdQuarterlyActual === 0) {
    for (const mgr of Object.values(result.managerActuals)) {
      result.bdYearlyActual += mgr.yearlyActual;
      result.bdQuarterlyActual += mgr.quarterlyActual;
    }
  }

  // Sum manager monthly actuals into bdMonthlyActuals if not directly parsed
  if (Object.keys(result.bdMonthlyActuals).length === 0) {
    for (const mgr of Object.values(result.managerActuals)) {
      DSH_FISCAL_MONTHS.forEach((month) => {
        result.bdMonthlyActuals[month] = (result.bdMonthlyActuals[month] ?? 0) + (mgr.monthlyActuals[month] ?? 0);
      });
    }
  }

  return result;
}

function parseDate(value: string | undefined): string | null {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized === "-") {
    return null;
  }

  return normalized;
}

function getPeriodLabel(): string {
  return `${getCurrentFiscalQuarterLabel()} | BD Team`;
}

function getMonthLabel(month: number): string {
  return `${month}월`;
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
  return `¥${Math.round(amount).toLocaleString()}`;
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

function createEmptyActivitySnapshot(): ActivitySnapshot {
  return {
    goal: { LD: 0, ACC: 0, OPP: 0, SOL: 0, VST: 0 },
    actual: { LD: 0, ACC: 0, OPP: 0, SOL: 0, VST: 0 },
  };
}

function createEmptyManagerBucket(): ManagerBucket {
  return {
    wonRevenue: 0,
    pipelineRevenue: 0,
    newRevenue: 0,
    renewRevenue: 0,
    dealsTotal: 0,
    dealsWon: 0,
  };
}

function findLowestProgressActivity(activityStages: ActivityStage[]): ActivityStage | null {
  let lowest: ActivityStage | null = null;

  for (const stage of activityStages) {
    if (!lowest || (stage.progress ?? 0) < (lowest.progress ?? 0)) {
      lowest = stage;
    }
  }

  return lowest;
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
  const minimumColumns = Math.max(headerRow.length, 13);

  return rows
    .slice(2)
    .map((sourceRow) => padRow(sourceRow, minimumColumns))
    .filter((row) => row[0]?.trim())
    .map((row, index) => {
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
        monthTotals: Object.fromEntries(
          monthColumns.map(({ month, index: columnIndex }) => [month, parseNumber(row[columnIndex])]),
        ),
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
  const weakestStage = findLowestProgressActivity(activityStages);

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
      trend: weakestStage
        ? `${weakestStage.stage} ${weakestStage.actual ?? 0}/${weakestStage.goal ?? weakestStage.fullMark}`
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
      label: getMonthLabel(month),
      month,
      actual: Math.round(cumulativeTarget * factors[index]),
      target: cumulativeTarget,
      isDummy: true,
    };
  });
}

function buildYearlyPacingData(
  monthlyActuals: Map<number, number>,
  monthlyTargets: Record<number, number>,
): RevenuePacingPoint[] {
  let runningActual = 0;
  let runningTarget = 0;

  return DSH_FISCAL_MONTHS.map((month) => {
    runningActual += monthlyActuals.get(month) ?? 0;
    runningTarget += monthlyTargets[month] ?? 0;

    return {
      label: getMonthLabel(month),
      month,
      actual: runningActual,
      target: runningTarget,
    };
  });
}

function buildPacingData(monthlyActuals: Map<number, number>, totalTarget: number): RevenuePacingPoint[] {
  const quarterMonths = getCurrentFiscalQuarterMonths();
  const actualByMonth = quarterMonths.map((month) => monthlyActuals.get(month) ?? 0);

  if (actualByMonth.every((value) => value <= 0)) {
    return buildFallbackPacing(totalTarget);
  }

  const linearMonthlyTarget = totalTarget > 0 ? totalTarget / quarterMonths.length : 0;
  let runningActual = 0;

  return quarterMonths.map((month, index) => {
    runningActual += actualByMonth[index] ?? 0;

    return {
      label: getMonthLabel(month),
      month,
      actual: runningActual,
      target: Math.round(linearMonthlyTarget * (index + 1)),
    };
  });
}

function buildAgingData(revenueRows: RevenueRow[]): DealAgingPoint[] {
  const now = new Date();

  // Show pipeline (non-confirmed) deals sorted by amount desc — these are the deals
  // waiting to be closed. "Days" is estimated from the fiscal year start (April).
  // For confirmed deals we show how long since activation (renewal / upsell tracking).
  const fiscalYearStart = new Date(now.getFullYear(), 3, 1); // April 1
  if (fiscalYearStart > now) {
    fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
  }

  const pipelinePoints: DealAgingPoint[] = revenueRows
    .filter((row) => !row.firstPayment)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 7)
    .map((row) => ({
      id: row.id,
      name: row.account,
      stage: row.status || "Pipeline",
      days: Math.round((now.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24)),
      value: row.amount,
      prob: row.probability,
    }));

  const activatedPoints: DealAgingPoint[] = revenueRows
    .filter((row) => Boolean(row.firstPayment))
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

  // Prefer pipeline deals; fall back to activated if pipeline is empty
  const points = pipelinePoints.length > 0 ? pipelinePoints : activatedPoints;
  return points.slice(0, 7);
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
      : `${account.manager} / ${account.region} / ${account.type}`,
    status: account.probability >= 80 ? "urgent" : "normal",
    isDummy: account.isDummy,
  }));
}

function summarizeRevenueRows(revenueRows: RevenueRow[]): RevenueSummary {
  // Track all 12 fiscal months for yearly view
  const monthlyActuals = new Map<number, number>(
    DSH_FISCAL_MONTHS.map((month) => [month, 0]),
  );
  const managerBuckets = new Map<string, ManagerBucket>();
  const regionCounts = new Map<string, { total: number; activated: number }>();
  const regionRevenue = new Map<string, number>();

  let activatedCount = 0;
  let newRevenue = 0;
  let renewRevenue = 0;
  let directRevenue = 0;
  let channelRevenue = 0;

  for (const row of revenueRows) {
    const currentRegion = regionCounts.get(row.location) ?? { total: 0, activated: 0 };
    currentRegion.total += 1;
    currentRegion.activated += row.firstPayment ? 1 : 0;
    regionCounts.set(row.location, currentRegion);

    // Confirmed revenue per region (firstPayment = red = actual)
    if (row.firstPayment) {
      regionRevenue.set(row.location, (regionRevenue.get(row.location) ?? 0) + row.amount);
    }

    const currentManager = managerBuckets.get(row.manager) ?? createEmptyManagerBucket();
    currentManager.dealsTotal += 1;

    if (row.firstPayment) {
      currentManager.wonRevenue += row.amount;
      currentManager.dealsWon += 1;
      activatedCount += 1;
    } else {
      currentManager.pipelineRevenue += Math.round(row.amount * (row.probability / 100));
    }

    if (row.status === "New") {
      newRevenue += row.amount;
      currentManager.newRevenue += row.amount;
    }

    if (row.status === "Renew") {
      renewRevenue += row.amount;
      currentManager.renewRevenue += row.amount;
    }

    if (row.type === "Direct") {
      directRevenue += row.amount;
    }

    if (row.type === "Channel") {
      channelRevenue += row.amount;
    }

    // Only confirmed (firstPayment) rows contribute to monthly actuals
    if (row.firstPayment) {
      for (const [month, amount] of Object.entries(row.monthTotals)) {
        const monthNumber = Number(month);
        if (monthlyActuals.has(monthNumber)) {
          monthlyActuals.set(monthNumber, (monthlyActuals.get(monthNumber) ?? 0) + amount);
        }
      }
    }

    managerBuckets.set(row.manager, currentManager);
  }

  const yearlyActual = Array.from(monthlyActuals.values()).reduce((sum, v) => sum + v, 0);

  return {
    managerBuckets,
    regionCounts,
    regionRevenue,
    monthlyActuals,
    activatedCount,
    newRevenue,
    renewRevenue,
    directRevenue,
    channelRevenue,
    yearlyActual,
  };
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
      coordinates: REGION_COORDINATES["서울"],
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
      coordinates: REGION_COORDINATES["경기"],
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
      coordinates: REGION_COORDINATES["부산"],
      isDummy: true,
    },
  ];

  const individuals: IndividualData[] = [
    {
      name: "Han",
      wonRevenue: 410,
      pipelineRevenue: 140,
      target: 460,
      progress: 89,
      deals_total: 4,
      deals_won: 2,
      isDummy: true,
    },
    {
      name: "Wangchan",
      wonRevenue: 320,
      pipelineRevenue: 180,
      target: 460,
      progress: 70,
      deals_total: 4,
      deals_won: 1,
      isDummy: true,
    },
    {
      name: "Junhyuk",
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
      name: "서울 교육그룹",
      manager: "Han",
      region: "서울",
      type: "Direct",
      status: "New",
      version: "Hardware",
      amount: 220,
      firstPayment: null,
      remark: "KA Focus Account",
      importance: "KA",
      probability: 82,
      isDummy: true,
    },
    {
      id: "dummy-acct-2",
      name: "경기 러닝랩",
      manager: "Wangchan",
      region: "경기",
      type: "Channel",
      status: "Renew",
      version: "Subscription",
      amount: 180,
      firstPayment: "2026-03-10",
      remark: "A-class account",
      importance: "A",
      probability: 76,
      isDummy: true,
    },
    {
      id: "dummy-acct-3",
      name: "부산 캠퍼스",
      manager: "Junhyuk",
      region: "부산",
      type: "Direct",
      status: "New",
      version: "Hardware",
      amount: 160,
      firstPayment: null,
      remark: "Standard lead",
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
    topManager: individuals[0]?.name ?? "BD",
    criticalRegionCount: 1,
    yearlyTarget: 5520,
    yearlyActual: 1010,
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
    yearlyPacing: buildFallbackPacing(teamSummary.yearlyTarget ?? teamSummary.targetRevenue * 4),
    aging: buildAgingData([]),
    periodLabel: getPeriodLabel(),
    dataSource: "fallback",
    lastUpdated: new Date().toISOString(),
  };
}

function buildDashboardFromRanges(sheetRows: SheetRanges, dataSource: DashboardDataSource): DashboardPayload {
  const { fiscalQuarter, calendarMonth } = getFiscalCalendarInfo();
  const dshTargets = parseDshSheet(sheetRows[DSH_RANGE], fiscalQuarter);
  const { regional } = parseSegRows(sheetRows[SEG_RANGE]);
  const revenueRows = parseRevenueRows(sheetRows[REV_RANGE]);
  const kpiByMember = parseKpiRows(sheetRows[KPI_RANGE]);

  if (regional.length === 0 || revenueRows.length === 0) {
    return buildMinimalFallbackDashboard();
  }

  // ── Revenue source: DSH Status (confirmed revenue) ──
  // Fall back to SEG totals only if DSH parsing found nothing.
  const bdQuarterTarget = dshTargets.bdQuarterlyTarget || regional.reduce((s, r) => s + r.target, 0);
  const bdYearlyTarget = dshTargets.bdYearlyTarget || bdQuarterTarget * 4;
  const totalRevenue = dshTargets.bdQuarterlyActual || regional.reduce((s, r) => s + r.revenue, 0);

  const revenueSummary = summarizeRevenueRows(revenueRows);
  const regionalWithCounts = regional.map((row) => {
    const counts = revenueSummary.regionCounts.get(row.name) ?? { total: 0, activated: 0 };
    const velocity = counts.total > 0 ? Math.round((counts.activated / counts.total) * 100) : 0;

    // Use confirmed (firstPayment) revenue from REV sheet as actual.
    // Falls back to SEG status revenue only when no confirmed deal exists for that region.
    const confirmedRevenue = revenueSummary.regionRevenue.get(row.name);
    const revenue = confirmedRevenue !== undefined ? confirmedRevenue : row.revenue;
    const progress = row.target > 0 ? Math.round((revenue / row.target) * 100) : 0;

    return {
      ...row,
      revenue,
      progress,
      status: getRegionStatus(progress),
      deals_active: counts.total,
      deals_closed: counts.activated,
      velocity,
    };
  });

  const managerNames = Array.from(
    new Set([
      ...revenueSummary.managerBuckets.keys(),
      ...Object.keys(kpiByMember),
    ]),
  ).filter(name => (TARGET_MANAGERS as readonly string[]).includes(name.toLowerCase()));

  // Per-manager quarterly target from DSH; fall back to equal split
  const fallbackEqualTarget = managerNames.length > 0 ? Math.round(bdQuarterTarget / managerNames.length) : 0;
  const getManagerTarget = (name: string): number =>
    dshTargets.managerTargets[name.toLowerCase()]?.quarterlyTarget ?? fallbackEqualTarget;

  const activityTotals = Object.fromEntries(
    ACTIVITY_KEYS.map((key) => [key, { goal: 0, actual: 0 }]),
  ) as Record<ActivityKey, { goal: number; actual: number }>;

  const individuals: IndividualData[] = managerNames
    .map((manager) => {
      const bucket = revenueSummary.managerBuckets.get(manager) ?? createEmptyManagerBucket();
      const activity = kpiByMember[manager] ?? createEmptyActivitySnapshot();
      const managerTarget = getManagerTarget(manager);
      const kpis: IndividualKpi[] = ACTIVITY_KEYS.map((key) => {
        const goal = activity.goal[key];
        const actual = activity.actual[key];

        activityTotals[key].goal += goal;
        activityTotals[key].actual += actual;

        return {
          key,
          label: ACTIVITY_LABELS[key],
          goal,
          actual,
          progress: goal > 0 ? Math.round((actual / goal) * 100) : 0,
        };
      });
      const activityGoal = kpis.reduce((sum, item) => sum + item.goal, 0);
      const activityActual = kpis.reduce((sum, item) => sum + item.actual, 0);

      // Use DSH Status actual as wonRevenue when available; fall back to REV confirmed deals
      const mgrKey = manager.toLowerCase();
      const dshActual = dshTargets.managerActuals[mgrKey]?.quarterlyActual;
      const managerWonRevenue = dshActual != null && dshActual > 0 ? dshActual : bucket.wonRevenue;

      const monthlyWon = dshTargets.managerActuals[mgrKey]?.monthlyActuals[calendarMonth] ?? 0;
      const monthlyTarget = dshTargets.managerTargets[mgrKey]?.monthlyTargets[calendarMonth] ?? 0;
      const yearlyWon = dshTargets.managerActuals[mgrKey]?.yearlyActual ?? 0;
      const yearlyTarget = dshTargets.managerTargets[mgrKey]?.yearlyTarget ?? 0;

      return {
        name: manager,
        wonRevenue: managerWonRevenue,
        pipelineRevenue: bucket.pipelineRevenue,
        target: managerTarget,
        progress: managerTarget > 0 ? Math.round((managerWonRevenue / managerTarget) * 100) : 0,
        deals_total: bucket.dealsTotal,
        deals_won: bucket.dealsWon,
        monthlyWon,
        monthlyTarget,
        yearlyWon,
        yearlyTarget,
        newRevenue: bucket.newRevenue,
        renewRevenue: bucket.renewRevenue,
        activityGoal,
        activityActual,
        kpis,
      };
    })
    .sort((left, right) => right.wonRevenue - left.wonRevenue);

  const activitySummary: ActivityStage[] = ACTIVITY_KEYS.map((key) => ({
    stage: ACTIVITY_LABELS[key],
    value: activityTotals[key].actual,
    fullMark: activityTotals[key].goal,
    goal: activityTotals[key].goal,
    actual: activityTotals[key].actual,
    progress: activityTotals[key].goal > 0
      ? Math.round((activityTotals[key].actual / activityTotals[key].goal) * 100)
      : 0,
  }));

  const activityGoal = activitySummary.reduce((sum, item) => sum + (item.goal ?? item.fullMark), 0);
  const activityActual = activitySummary.reduce((sum, item) => sum + (item.actual ?? item.value), 0);
  const attainment = bdQuarterTarget > 0 ? (totalRevenue / bdQuarterTarget) * 100 : 0;

  // Current month target/actual from DSH monthly breakdown
  const currentMonthTarget = dshTargets.bdMonthlyTargets[calendarMonth] ?? 0;
  // Prefer DSH Status monthly actual; fall back to REV sheet month column sum
  const currentMonthActual =
    dshTargets.bdMonthlyActuals[calendarMonth] ??
    revenueSummary.monthlyActuals.get(calendarMonth) ??
    0;

  const teamSummary: TeamSummary = {
    targetRevenue: bdQuarterTarget,
    actualRevenue: totalRevenue,
    gapRevenue: Math.max(bdQuarterTarget - totalRevenue, 0),
    attainment,
    accountCount: revenueRows.length,
    activatedCount: revenueSummary.activatedCount,
    newRevenue: revenueSummary.newRevenue,
    renewRevenue: revenueSummary.renewRevenue,
    directRevenue: revenueSummary.directRevenue,
    channelRevenue: revenueSummary.channelRevenue,
    activityGoal,
    activityActual,
    activityCompletion: activityGoal > 0 ? (activityActual / activityGoal) * 100 : 0,
    topManager: individuals[0]?.name ?? "BD",
    criticalRegionCount: regionalWithCounts.filter((row) => row.progress < 80).length,
    yearlyTarget: bdYearlyTarget,
    yearlyActual: dshTargets.bdYearlyActual || revenueSummary.yearlyActual,
    monthlyTarget: currentMonthTarget,
    monthlyActual: currentMonthActual,
    currentMonth: calendarMonth,
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

  const quarterMonths = getCurrentFiscalQuarterMonths();

  // Prefer DSH monthly actuals (Status Total rows) as the single source of truth.
  // Fall back to REV confirmed-only monthly actuals when DSH monthly data is absent.
  const hasDshMonthlyActuals = Object.keys(dshTargets.bdMonthlyActuals).length > 0;
  const pacingActualsSource: Map<number, number> = hasDshMonthlyActuals
    ? new Map(DSH_FISCAL_MONTHS.map((m) => [m, dshTargets.bdMonthlyActuals[m] ?? 0]))
    : revenueSummary.monthlyActuals;

  const quarterlyActuals = new Map(quarterMonths.map((m) => [m, pacingActualsSource.get(m) ?? 0]));

  return {
    stats: buildStats(teamSummary, activitySummary),
    regional: regionalWithCounts,
    bottleneck: activitySummary,
    individuals,
    focusAccounts,
    topAccounts,
    hotDeals: buildHotDeals(focusAccounts),
    teamSummary,
    pacing: buildPacingData(quarterlyActuals, bdQuarterTarget),
    yearlyPacing: buildYearlyPacingData(pacingActualsSource, dshTargets.bdMonthlyTargets),
    aging: buildAgingData(revenueRows),
    periodLabel: getPeriodLabel(),
    dataSource,
    lastUpdated: new Date().toISOString(),
  };
}

function rememberDashboard(data: DashboardPayload, ttlMs: number): DashboardPayload {
  cache = {
    data,
    expiresAt: Date.now() + ttlMs,
  };

  return data;
}

async function loadLiveDashboard(): Promise<DashboardPayload> {
  const values = await getMultipleSheetValues([DSH_RANGE, SEG_RANGE, REV_RANGE, KPI_RANGE]);

  const sheetRanges: SheetRanges = {
    [DSH_RANGE]: values[DSH_RANGE] ?? [],
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

  if (!hasGoogleSheetsConfig()) {
    return rememberDashboard(cache?.data ?? buildMinimalFallbackDashboard(), FALLBACK_CACHE_TTL_MS);
  }

  if (inflightDashboard) {
    return inflightDashboard;
  }

  inflightDashboard = loadLiveDashboard()
    .then((liveData) => rememberDashboard(liveData, LIVE_CACHE_TTL_MS))
    .catch((error) => {
      console.error("Failed to load BD dashboard from Google Sheets:", error);

      if (cache) {
        return rememberDashboard(cache.data, FALLBACK_CACHE_TTL_MS);
      }

      return rememberDashboard(buildMinimalFallbackDashboard(), FALLBACK_CACHE_TTL_MS);
    })
    .finally(() => {
      inflightDashboard = null;
    });

  return inflightDashboard;
}
