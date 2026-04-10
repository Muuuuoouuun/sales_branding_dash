import { NextResponse } from "next/server";
import { getBdDashboardData } from "@/lib/server/bdDashboard";
import type { FocusAccount } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface HardwareDeal {
  id: string;
  account: string;
  manager: string;
  region: string;
  type: string;
  status: string;
  version: string;
  amount: number;
  firstPayment: string | null;
  probability: number;
  importance: string;
  remark: string;
  isConfirmed: boolean; // firstPayment !== null
}

interface ManagerStat {
  pipeline: number;
  confirmed: number;
  count: number;
  confirmedCount: number;
}

interface RegionStat {
  pipeline: number;
  confirmed: number;
  count: number;
}

interface HardwarePipelinePayload {
  deals: HardwareDeal[];
  totalPipeline: number;    // 전체 딜 amount 합산
  confirmedRevenue: number; // firstPayment 있는 딜 amount 합산
  activeCount: number;      // firstPayment 없는 딜 수 (진행 중)
  confirmedCount: number;   // firstPayment 있는 딜 수
  avgDealSize: number;      // 전체 deals의 평균 amount (0 제외)
  winRate: number;          // confirmedCount / deals.length * 100, 소수점 1자리
  byManager: Record<string, ManagerStat>;
  byRegion: Record<string, RegionStat>;
}

// ---------------------------------------------------------------------------
// Hardware filter
// ---------------------------------------------------------------------------

const isHardware = (a: FocusAccount): boolean =>
  a.name.toLowerCase().includes("hardware") ||
  a.type.toLowerCase().includes("hardware") ||
  a.version.toLowerCase().includes("hardware");

// ---------------------------------------------------------------------------
// GET /api/hardware/pipeline
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const data = await getBdDashboardData();
    const hwAccounts = data.focusAccounts.filter(isHardware);

    // Map to HardwareDeal
    const deals: HardwareDeal[] = hwAccounts.map((a) => ({
      id: a.id,
      account: a.name,
      manager: a.manager,
      region: a.region,
      type: a.type,
      status: a.status,
      version: a.version,
      amount: a.amount,
      firstPayment: a.firstPayment,
      probability: a.probability,
      importance: a.importance,
      remark: a.remark,
      isConfirmed: a.firstPayment !== null,
    }));

    // Aggregate totals
    const totalPipeline = deals.reduce((sum, d) => sum + d.amount, 0);
    const confirmedDeals = deals.filter((d) => d.isConfirmed);
    const confirmedRevenue = confirmedDeals.reduce((sum, d) => sum + d.amount, 0);
    const activeCount = deals.filter((d) => !d.isConfirmed).length;
    const confirmedCount = confirmedDeals.length;

    const nonZeroAmounts = deals.filter((d) => d.amount !== 0);
    const avgDealSize =
      nonZeroAmounts.length > 0
        ? nonZeroAmounts.reduce((sum, d) => sum + d.amount, 0) /
          nonZeroAmounts.length
        : 0;

    const winRate =
      deals.length > 0
        ? Math.round((confirmedCount / deals.length) * 1000) / 10
        : 0;

    // byManager aggregation
    const byManager: Record<string, ManagerStat> = {};
    for (const d of deals) {
      if (!byManager[d.manager]) {
        byManager[d.manager] = { pipeline: 0, confirmed: 0, count: 0, confirmedCount: 0 };
      }
      byManager[d.manager].pipeline += d.amount;
      byManager[d.manager].count += 1;
      if (d.isConfirmed) {
        byManager[d.manager].confirmed += d.amount;
        byManager[d.manager].confirmedCount += 1;
      }
    }

    // byRegion aggregation
    const byRegion: Record<string, RegionStat> = {};
    for (const d of deals) {
      if (!byRegion[d.region]) {
        byRegion[d.region] = { pipeline: 0, confirmed: 0, count: 0 };
      }
      byRegion[d.region].pipeline += d.amount;
      byRegion[d.region].count += 1;
      if (d.isConfirmed) {
        byRegion[d.region].confirmed += d.amount;
      }
    }

    const payload: HardwarePipelinePayload = {
      deals,
      totalPipeline,
      confirmedRevenue,
      activeCount,
      confirmedCount,
      avgDealSize,
      winRate,
      byManager,
      byRegion,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/hardware/pipeline] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hardware pipeline data" },
      { status: 500 },
    );
  }
}
