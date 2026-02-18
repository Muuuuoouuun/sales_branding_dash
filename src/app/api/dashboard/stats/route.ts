import { NextResponse } from 'next/server';

export async function GET() {
    const stats = [
        {
            label: "Total Revenue",
            value: "$9.3M",
            trend: "+12.5% vs Target",
            trendType: "up", // 'up' | 'down'
            trendLabel: "vs Target"
        },
        {
            label: "Growth Velocity",
            value: "8.2x",
            trend: "High Momentum",
            trendType: "up",
            trendLabel: "Momentum"
        },
        {
            label: "Active Deals",
            value: "142",
            trend: "-3.2% vs Last Month",
            trendType: "down",
            trendLabel: "vs Last Month"
        },
        {
            label: "Kill-Zone Ratio",
            value: "18%",
            trend: "Critical at Negotiation",
            trendType: "critical", // 'critical' will map to AlertTriangle
            trendLabel: "at Negotiation"
        }
    ];

    return NextResponse.json(stats);
}
