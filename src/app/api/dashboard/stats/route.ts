import { NextResponse } from "next/server";
import { getBdDashboardData } from "@/lib/server/bdDashboard";

export async function GET() {
  const dashboard = await getBdDashboardData();
  return NextResponse.json(dashboard.stats);
}
