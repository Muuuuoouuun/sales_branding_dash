import { NextResponse } from "next/server";
import { resetDashboardCache, getBdDashboardData } from "@/lib/server/bdDashboard";

/** POST /api/dashboard/refresh — 서버 캐시를 bust 하고 즉시 새 데이터를 반환합니다. */
export async function POST() {
  resetDashboardCache();
  const data = await getBdDashboardData();
  return NextResponse.json(data);
}
