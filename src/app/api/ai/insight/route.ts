import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { regionalData, bottleneckData } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
    Act as a "Sales Strategy Director". Analyze the following sales data and provide a concise, actionable strategic insight (max 2 sentences).
    Focus on underperforming regions or bottlenecks.
    
    Data:
    Regions: ${JSON.stringify(regionalData)}
    Bottlenecks: ${JSON.stringify(bottleneckData)}
    
    Output format:
    "Insight: [Analysis]. Action: [Specific Step]. Script: [One-liner]"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ insight: text });

    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ insight: "AI Service Unavailable. Check API Key." }, { status: 500 });
    }
}
