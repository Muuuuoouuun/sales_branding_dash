import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type ProjectAiContext = {
  periodLabel?: string;
  dataSource?: string;
  teamSummary?: {
    attainment?: string;
    gapRevenue?: string;
    targetRevenue?: string;
    actualRevenue?: string;
    activityCompletion?: string;
    criticalRegionCount?: number;
    accountCount?: number;
    activatedCount?: number;
    topManager?: string;
  };
  regions?: {
    strongest?: { name: string; progress: number; revenue: string; target: string } | null;
    weakest?: { name: string; progress: number; revenue: string; target: string } | null;
    watchlist?: { name: string; progress: number; revenue: string; target: string }[];
  };
  execution?: {
    weakestStage?: { stage: string; progress: number } | null;
    topRep?: { name: string; progress: number; wonRevenue: string; pipelineRevenue: string } | null;
  };
  pipeline?: {
    openLeadCount?: number;
    weightedPipeline?: string;
    topLead?: {
      company: string;
      contact: string;
      region: string;
      stage: string;
      probability: number;
      revenuePotential: string;
      owner: string;
      dueDate: string;
      dueLabel: string;
      action: string;
    } | null;
    urgentActions?: {
      salesRep: string;
      target: string;
      prob: string;
      action: string;
      due: string;
      region: string;
      stage: string;
    }[];
  };
  reps?: {
    name: string;
    progress: number;
    wonRevenue: string;
    pipelineRevenue: string;
    activityActual: number;
    activityGoal: number;
  }[];
  methodology?: {
    id?: string;
    label?: string;
    summary?: string;
    bestFor?: string;
    whenToUse?: string;
    quote?: string;
    stages?: string[];
    principles?: string[];
  };
};

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as {
      regionalData?: unknown[];
      individuals?: unknown[];
      methodology?: string;
      context?: ProjectAiContext;
    };

    const methodology = payload.methodology || "Challenger";
    const liveContext =
      payload.context ?? {
        periodLabel: "BD Team",
        dataSource: "unknown",
        regionalData: payload.regionalData ?? [],
        individuals: payload.individuals ?? [],
        methodology,
      };

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });

    const prompt = `
You are the Project Strategy copilot for a BD sheet-driven operating system.
Use only the supplied live context. Do not invent metrics or overstate certainty.
Keep the tone direct, operator-friendly, and commercially useful.
If the data source is fallback or a signal is missing, say so plainly.

Selected methodology: ${methodology}

Live project context:
${JSON.stringify(liveContext, null, 2)}

Return exactly three sections with these headings:
## Current state
Summarize the quarter, the strongest and weakest signals, and the main operating risk in 2-3 short paragraphs.

## Priority moves
List 3 concrete actions for the next 7 days. Each action must reference a real signal from the context.

## Methodology fit
Explain how the selected methodology should be applied to this team right now. Keep it concise and practical.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ insight: text });
  } catch (error) {
    console.error("AI Project Strategy Error:", error);
    return NextResponse.json(
      { insight: "AI analysis failed. Check Gemini connectivity and live sheet data." },
      { status: 500 },
    );
  }
}
