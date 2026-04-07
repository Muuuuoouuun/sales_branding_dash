export type TrendType = "up" | "down" | "critical";
export type DashboardDataSource = "google-sheets" | "fallback";

export interface Stat {
  label: string;
  value: string;
  trend: string;
  trendType: TrendType;
  trendLabel: string;
}

export interface RegionData {
  name: string;
  revenue: number;
  target: number;
  progress: number;
  deals_active: number;
  deals_closed: number;
  status: "good" | "warning" | "critical";
  velocity?: number;
  coordinates?: [number, number];
  isDummy?: boolean;
  revenueM?: number;  // current month actual
  revenueQ?: number;  // current quarter YTD actual
}

export interface IndividualKpi {
  key: string;
  label: string;
  goal: number;
  actual: number;
  progress: number;
}

export interface IndividualData {
  name: string;
  wonRevenue: number;
  pipelineRevenue: number;
  target: number;
  progress: number;
  deals_total: number;
  deals_won: number;
  monthlyWon?: number;
  monthlyTarget?: number;
  yearlyWon?: number;
  yearlyTarget?: number;
  newRevenue?: number;
  renewRevenue?: number;
  activityGoal?: number;
  activityActual?: number;
  kpis?: IndividualKpi[];
  isDummy?: boolean;
}

export interface ActivityStage {
  stage: string;
  value: number;
  fullMark: number;
  goal?: number;
  actual?: number;
  progress?: number;
  isDummy?: boolean;
}

export interface FocusAccount {
  id: string;
  name: string;
  manager: string;
  region: string;
  type: string;
  status: string;
  version: string;
  amount: number;
  firstPayment: string | null;
  remark: string;
  importance: string;
  probability: number;
  monthTotals?: Record<number, number>;
  isDummy?: boolean;
}

export interface HotDeal {
  id: string;
  client: string;
  manager: string;
  region: string;
  version: string;
  value: number;
  probability: number;
  note: string;
  status: "urgent" | "normal";
  isDummy?: boolean;
}

export interface RevenuePacingPoint {
  label: string;
  month: number;
  actual: number;
  target: number;
  isDummy?: boolean;
}

export interface DealAgingPoint {
  id: string;
  name: string;
  stage: string;
  days: number;
  value: number;
  prob: number;
  isDummy?: boolean;
}

export interface TeamSummary {
  targetRevenue: number;
  actualRevenue: number;
  gapRevenue: number;
  attainment: number;
  accountCount: number;
  activatedCount: number;
  newRevenue: number;
  renewRevenue: number;
  directRevenue: number;
  channelRevenue: number;
  activityGoal: number;
  activityActual: number;
  activityCompletion: number;
  topManager: string;
  criticalRegionCount: number;
  yearlyTarget?: number;
  yearlyActual?: number;
  monthlyTarget?: number;
  monthlyActual?: number;
  currentMonth?: number;
}

export interface DashboardPayload {
  stats: Stat[];
  regional: RegionData[];
  bottleneck: ActivityStage[];
  individuals: IndividualData[];
  focusAccounts: FocusAccount[];
  topAccounts: FocusAccount[];
  hotDeals: HotDeal[];
  teamSummary: TeamSummary;
  pacing: RevenuePacingPoint[];
  yearlyPacing?: RevenuePacingPoint[];
  aging: DealAgingPoint[];
  periodLabel: string;
  dataSource: DashboardDataSource;
  lastUpdated: string;
}
