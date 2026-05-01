import OpenAI from "openai";
import { NextResponse } from "next/server";

import { analyzeSignals } from "@/lib/analyzeData";
import type { CampaignGoal, MockConnectorData } from "@/lib/mockData";

type AgentRequest = {
  goal: CampaignGoal;
  prompt: string;
  data: MockConnectorData;
};

type AgentResponse = {
  diagnosis: string;
  campaignShell: string;
  personaVariants: string[];
  measurementPlan: string[];
};

const SYSTEM_PROMPT = `You are a senior lifecycle marketing strategist.
Return ONLY valid JSON with this exact shape:
{
  "diagnosis": "string",
  "campaignShell": "string",
  "personaVariants": ["string", "string", "string", "string", "string"],
  "measurementPlan": ["string", "string", "string", "string"]
}
Keep each field concise, practical, and specific to the provided data signals and goal.`;

function fallbackPlan(goal: CampaignGoal, data: MockConnectorData): AgentResponse {
  const signals = analyzeSignals(data);
  return {
    diagnosis: `Traffic quality is healthy but conversion opportunity remains. With ${signals.cartAbandoners} cart abandoners and a ${signals.conversionRate}% conversion rate, recovery journeys should prioritize urgency, social proof, and low-friction checkout nudges.`,
    campaignShell: `${goal} campaign: Trigger a 3-step flow (1h, 24h, 72h) for high-intent visitors with product-view depth >= 3 and no purchase. Step 1: reminder + proof. Step 2: curated alternatives + objections handling. Step 3: incentive + deadline.`,
    personaVariants: [
      "Price-sensitive browser: emphasize value bundles and free shipping thresholds.",
      "Comparison shopper: highlight differentiation, ratings, and UGC.",
      "Loyal repeat customer: reward with VIP early access or points multiplier.",
      "Category explorer: provide curated picks based on viewed categories.",
      "Urgent buyer: stress stock scarcity and delivery timing confidence.",
    ],
    measurementPlan: [
      "Primary KPI: abandoned-cart recovery conversion within 7 days.",
      "Guardrail: discount dependency (orders with promo / total recovered orders).",
      "Incrementality: holdout cohort against triggered flow.",
      "Secondary: AOV uplift and time-to-purchase reduction.",
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentRequest;

    if (!body.goal || !body.data || !body.prompt) {
      return NextResponse.json(
        { error: "Missing goal, prompt, or data payload." },
        { status: 400 },
      );
    }

    const signals = analyzeSignals(body.data);
    const payload = {
      goal: body.goal,
      prompt: body.prompt,
      signals,
      source: body.data.source,
      syncedAt: body.data.syncedAt,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(fallbackPlan(body.goal, body.data));
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Create a campaign strategy from this JSON payload:\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(fallbackPlan(body.goal, body.data));
    }

    const parsed = JSON.parse(content) as AgentResponse;

    if (
      !parsed.diagnosis ||
      !parsed.campaignShell ||
      !Array.isArray(parsed.personaVariants) ||
      parsed.personaVariants.length !== 5 ||
      !Array.isArray(parsed.measurementPlan)
    ) {
      return NextResponse.json(fallbackPlan(body.goal, body.data));
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Agent route failed", error);
    return NextResponse.json(
      { error: "Failed to generate campaign plan." },
      { status: 500 },
    );
  }
}
