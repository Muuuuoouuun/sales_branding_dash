import { NextResponse } from 'next/server';

export async function GET() {
    const focusScores = [
        { name: "Kim Min-su", score: 88, label: "Top 10%" },
        { name: "Lee Ji-won", score: 72, label: "Top 30%" },
        { name: "Park Wei", score: 45, label: "Bottom 20%" },
    ];

    const actions = [
        {
            salesRep: "Kim Min-su",
            target: "Hyundai Motors (Tier 1)",
            prob: "85%",
            action: "Send 'ROI Case Study #4' regarding automation efficiency. Schedule closing meeting.",
            due: "Today, 2pm"
        },
        {
            salesRep: "Lee Ji-won",
            target: "SK Hynix (Tier 2)",
            prob: "60%",
            action: "Follow up on technical objection. Use Script B-4 (Security Compliance).",
            due: "Today, 4pm"
        },
        {
            salesRep: "Park Wei",
            target: "LG Chem",
            prob: "15%",
            action: "Re-engage. Lead has likely gone cold. Try 'New Feature' hook.",
            due: "Tomorrow"
        },
    ];

    return NextResponse.json({
        scores: focusScores,
        actions: actions
    });
}
