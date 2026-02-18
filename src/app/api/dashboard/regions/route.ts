import { NextResponse } from 'next/server';

export async function GET() {
    const regionalData = [
        { name: "Seoul", revenue: 4200, target: 4000, velocity: 95, coordinates: [150, 80], status: "good" },
        { name: "Busan", revenue: 2100, target: 3000, velocity: 65, coordinates: [220, 280], status: "warning" },
        { name: "Incheon", revenue: 1800, target: 2000, velocity: 78, coordinates: [110, 85], status: "good" },
        { name: "Daegu", revenue: 1200, target: 2500, velocity: 45, coordinates: [200, 220], status: "critical" },
        { name: "Gwangju", revenue: 900, target: 1200, velocity: 55, coordinates: [120, 250], status: "warning" },
        { name: "Daejeon", revenue: 1100, target: 1000, velocity: 88, coordinates: [150, 170], status: "good" },
        { name: "Ulsan", revenue: 1500, target: 1400, velocity: 92, coordinates: [230, 250], status: "good" },
    ];

    const bottleneckData = [
        { stage: "Lead", value: 100, fullMark: 150 },
        { stage: "Proposal", value: 90, fullMark: 150 },
        { stage: "Negotiation", value: 40, fullMark: 150 },
        { stage: "Contract", value: 35, fullMark: 150 },
    ];

    return NextResponse.json({
        regional: regionalData,
        bottleneck: bottleneckData
    });
}
