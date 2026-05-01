"use client";

import { useState } from "react";

import { analyzeSignals, type SignalSummary } from "@/lib/analyzeData";
import {
  mockBloomreachConnector,
  type CampaignGoal,
  type MockConnectorData,
} from "@/lib/mockData";

type AgentResponse = {
  diagnosis: string;
  campaignShell: string;
  personaVariants: string[];
  measurementPlan: string[];
};

type DemoTab = "Campaign Agent" | "Event Simulator" | "Journey Execution Log";

type ShopperProfile = {
  customer_id: string;
  email: string;
  persona: string;
  lifecycle_stage: string;
  product_affinity: string;
};

type SimEventType =
  | "product_view"
  | "cart_add"
  | "purchase"
  | "email_open"
  | "email_click";

type SimEvent = {
  event_id: string;
  customer_id: string;
  event_type: SimEventType;
  product_id: string;
  timestamp: string;
  properties: Record<string, string | number | boolean>;
};

type JourneyExecution = {
  segment: string;
  recommendation: string;
  steps: string[];
};

type EventPayload = {
  customer_ids: {
    registered: string;
  };
  event_type: SimEventType;
  timestamp: string;
  properties: {
    product_id: string;
    category: string;
    price: number;
  };
};

type JourneyActionPayload = {
  customer_ids: {
    registered: string;
  };
  action_type: "email" | "sms";
  campaign_id: string;
  message_variant: string;
  properties: {
    product_id: string;
    category: string;
  };
  status: "queued_mock";
  channel?: "sms";
};

type JourneyNode = {
  title:
    | "Entry Condition"
    | "Customer Segment"
    | "Prediction Model"
    | "Decision Split"
    | "Email Variant"
    | "SMS Fallback"
    | "Exit Condition"
    | "Measurement";
  description: string;
};

type DecisionConfidence = "High" | "Medium" | "Low";

type DecisioningInsights = {
  whySelected: string;
  conversionLikelihood: number;
  confidence: DecisionConfidence;
  primaryStrategy: string;
  secondaryStrategy: string;
};

const DEFAULT_PROMPT =
  "Build a campaign to recover high-intent shoppers who viewed products multiple times but did not purchase.";

export default function Home() {
  const [activeTab, setActiveTab] = useState<DemoTab>("Campaign Agent");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<MockConnectorData | null>(null);
  const [signals, setSignals] = useState<SignalSummary | null>(null);
  const [goal, setGoal] = useState<CampaignGoal>("Conversion");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [profile, setProfile] = useState<ShopperProfile>({
    customer_id: "cust_demo_001",
    email: "shopper@example.com",
    persona: "Style-driven browser",
    lifecycle_stage: "Consideration",
    product_affinity: "Athleisure",
  });

  const connectedAt = data?.syncedAt ? new Date(data.syncedAt).toLocaleString() : "";

  async function handleConnect() {
    setIsConnecting(true);
    setError(null);
    try {
      const loaded = await mockBloomreachConnector();
      setData(loaded);
      setSignals(analyzeSignals(loaded));
    } catch {
      setError("Connector failed to load mocked Bloomreach data.");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleGenerate() {
    if (!data || !signals) {
      setError("Connect Bloomreach MCP before generating a campaign.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
          prompt,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const payload = (await response.json()) as AgentResponse;
      setResult(payload);
    } catch {
      setError("Could not generate campaign output. Try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  }

  function createEvent(eventType: SimEventType) {
    const now = new Date();
    const productId =
      eventType === "email_open" || eventType === "email_click" ? "n/a" : "sku_101";
    const event: SimEvent = {
      event_id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      customer_id: profile.customer_id,
      event_type: eventType,
      product_id: productId,
      timestamp: now.toISOString(),
      properties: {
        channel:
          eventType === "email_open" || eventType === "email_click" ? "email" : "web",
        campaign: "recover-high-intent",
        value: eventType === "purchase" ? 78 : 0,
      },
    };

    setEvents((prev) => [event, ...prev]);

    setProfile((prev) => {
      if (eventType === "purchase") {
        return { ...prev, lifecycle_stage: "Active Customer" };
      }
      if (eventType === "cart_add") {
        return { ...prev, lifecycle_stage: "Cart Intent" };
      }
      if (eventType === "product_view") {
        return { ...prev, lifecycle_stage: "High Consideration" };
      }
      if (eventType === "email_click") {
        return { ...prev, lifecycle_stage: "Re-engaged" };
      }
      return prev;
    });
  }

  function evaluateJourneyLog(eventStream: SimEvent[]): JourneyExecution {
    const productViews = eventStream.filter((event) => event.event_type === "product_view").length;
    const hasCartAdd = eventStream.some((event) => event.event_type === "cart_add");
    const hasPurchase = eventStream.some((event) => event.event_type === "purchase");
    const hasEmailOpen = eventStream.some((event) => event.event_type === "email_open");
    const hasEmailClick = eventStream.some((event) => event.event_type === "email_click");

    let segment = "Browsing";
    let recommendation = "Continue behavioral monitoring and product recommendations.";

    if (productViews >= 2 && !hasPurchase) {
      segment = "High Intent Non-Buyer";
      recommendation = "Trigger urgency-focused journey with social proof and checkout nudge.";
    }
    if (hasCartAdd && !hasPurchase) {
      segment = "Cart Abandoner";
      recommendation = "Launch cart recovery flow with reminder and optional incentive.";
    }
    if (hasEmailOpen && !hasEmailClick) {
      recommendation = "Recommend subject line retest for better click-through.";
    }

    return {
      segment,
      recommendation,
      steps: [
        "Event received",
        "Profile updated",
        "Segment matched",
        "Trigger evaluated",
        "Journey step selected",
        "Email/SMS variant queued",
      ],
    };
  }

  const journeyLog = evaluateJourneyLog(events);
  const journeyActions = buildJourneyActions(journeyLog.segment, profile.customer_id);
  const journeyCanvasNodes = buildJourneyCanvasNodes(result);
  const decisioningInsights = buildDecisioningInsights(events, journeyLog.segment);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <div className="flex items-center justify-between rounded-2xl bg-slate-900/70 px-4 py-3 shadow-lg shadow-slate-950/40 backdrop-blur transition-all duration-200">
          <p className="text-sm font-semibold text-slate-100">Loomi Campaign Agent</p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
              data
                ? "bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/20"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            Connected to Bloomreach MCP
          </span>
        </div>

        <header className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 p-8 shadow-xl shadow-black/30 transition-all duration-200 hover:shadow-indigo-900/20">
          <p className="text-sm font-medium text-indigo-300/90">Loomi-Style Campaign Builder</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            AI campaign strategist for lifecycle teams
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-300/85">
            Explore a Bloomreach-style demo with campaign planning, customer event simulation, and
            journey execution logs.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-slate-900/70 p-1">
            {(["Campaign Agent", "Event Simulator", "Journey Execution Log"] as DemoTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-indigo-900/40"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
          <p className="mt-4 text-sm text-slate-400/90">
            Simulates Bloomreach Engagement-style Customer, Event, Catalog, and Email API workflows.
          </p>
        </header>

        <section className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
          <h2 className="text-base font-semibold">API Mapping</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300/90">
            <li>
              <span className="font-semibold text-slate-100">Tracking API:</span> collects
              product_view, cart_add, purchase, email_open, and email_click events.
            </li>
            <li>
              <span className="font-semibold text-slate-100">Customer API:</span> updates customer
              profile, segmentation, and prediction state.
            </li>
            <li>
              <span className="font-semibold text-slate-100">Catalog API:</span> provides product
              metadata for recommendations.
            </li>
            <li>
              <span className="font-semibold text-slate-100">Email API:</span> represents the
              eventual send/sync layer.
            </li>
            <li>
              <span className="font-semibold text-slate-100">Webhook/Orchestration Layer:</span>{" "}
              evaluates triggers and queues journey actions.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400/80">
            Explanatory demo UI only. No real Bloomreach API calls are made.
          </p>
        </section>

        {activeTab === "Campaign Agent" && (
          <>
            <section className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
              <h2 className="text-base font-semibold">Campaign Agent</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isConnecting ? "Connecting..." : "Connect Bloomreach MCP"}
                </button>
                {data && (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 shadow-sm shadow-emerald-500/20">
                    Connected to {data.source} at {connectedAt}
                  </span>
                )}
              </div>
            </section>

            {signals && (
              <section className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
                <h2 className="text-base font-semibold">Customer + Event Signals</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                    Customer profiles analyzed: {signals.audienceSize.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                    Event streams detected: 3 (view_product, add_to_cart, purchase)
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <SignalCard label="Audience size" value={signals.audienceSize.toLocaleString()} />
                  <SignalCard label="Conversion rate" value={`${signals.conversionRate}%`} />
                  <SignalCard label="AOV" value={`$${signals.aov}`} />
                  <SignalCard label="Cart abandoners" value={signals.cartAbandoners.toString()} />
                  <SignalCard label="Maturity level" value={signals.maturityLevel} />
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
              <h2 className="text-base font-semibold">Campaign brief</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label
                    htmlFor="campaign-prompt"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Prompt
                  </label>
                  <textarea
                    id="campaign-prompt"
                    className="mt-2 min-h-32 w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-violet-500/70 transition-all duration-200 focus:ring-2"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="goal" className="block text-sm font-medium text-slate-300">
                      Goal
                    </label>
                    <select
                      id="goal"
                      className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-3 text-sm text-slate-100 outline-none ring-violet-500/70 transition-all duration-200 focus:ring-2"
                      value={goal}
                      onChange={(event) => setGoal(event.target.value as CampaignGoal)}
                    >
                      <option value="Conversion">Conversion</option>
                      <option value="LTV">LTV</option>
                      <option value="Engagement">Engagement</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGenerating ? "Generating..." : "Generate Campaign"}
                  </button>
                </div>
              </div>
              {error && <p className="mt-4 text-sm font-medium text-rose-300">{error}</p>}
            </section>

            {result && (
              <>
                <section className="grid gap-4 lg:grid-cols-2">
                  <ResultCard title="Diagnosis">
                    <p className="text-sm leading-6 text-slate-700">{result.diagnosis}</p>
                  </ResultCard>
                  <ResultCard title="Campaign">
                    <div className="space-y-3 text-sm leading-6 text-slate-700">
                      <p>{result.campaignShell}</p>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p>
                          <span className="font-semibold text-slate-900">
                            Customer segmentation:
                          </span>{" "}
                          High-intent shoppers with repeated product views and no purchase.
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Event-based trigger:</span>{" "}
                          Repeated view-product activity followed by no purchase window.
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Customer prediction model:
                          </span>{" "}
                          Purchase propensity scoring from browse depth and recency.
                        </p>
                      </div>
                    </div>
                  </ResultCard>
                  <ResultCard title="Personas">
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {result.personaVariants.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </ResultCard>
                  <ResultCard title="Measurement">
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {result.measurementPlan.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </ResultCard>
                </section>

                <section className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">Journey Builder Canvas</h2>
                    <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-300 shadow-sm shadow-indigo-500/20">
                      Simulated orchestration flow
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300/85">
                    Connected journey nodes populated from generated campaign output when available.
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <div className="flex min-w-[1100px] items-stretch gap-2">
                      {journeyCanvasNodes.map((node, index) => (
                        <div key={node.title} className="flex items-center gap-2">
                          <article className="w-56 rounded-xl bg-slate-800/90 p-4 shadow-md shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-900/30">
                            <p className="text-xs font-semibold text-indigo-300">
                              Node {index + 1}
                            </p>
                            <h3 className="mt-1 text-sm font-semibold text-slate-100">{node.title}</h3>
                            <p className="mt-2 text-xs leading-5 text-slate-300/85">{node.description}</p>
                          </article>
                          {index < journeyCanvasNodes.length - 1 && (
                            <span className="text-slate-500" aria-hidden="true">
                              →
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === "Event Simulator" && (
          <section className="grid gap-4 lg:grid-cols-5">
            <ResultCard title="Shopper profile">
              <dl className="space-y-2 text-sm text-slate-300/90">
                <ProfileRow label="customer_id" value={profile.customer_id} />
                <ProfileRow label="email" value={profile.email} />
                <ProfileRow label="persona" value={profile.persona} />
                <ProfileRow label="lifecycle_stage" value={profile.lifecycle_stage} />
                <ProfileRow label="product_affinity" value={profile.product_affinity} />
              </dl>
            </ResultCard>

            <div className="lg:col-span-4 rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
              <h2 className="text-base font-semibold">Event Simulator</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton label="View Product" onClick={() => createEvent("product_view")} />
                <ActionButton label="Add to Cart" onClick={() => createEvent("cart_add")} />
                <ActionButton label="Purchase" onClick={() => createEvent("purchase")} />
                <ActionButton label="Email Open" onClick={() => createEvent("email_open")} />
                <ActionButton label="Email Click" onClick={() => createEvent("email_click")} />
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl bg-slate-900 shadow-inner shadow-black/40">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-800 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 font-medium">event_id</th>
                      <th className="px-3 py-2 font-medium">customer_id</th>
                      <th className="px-3 py-2 font-medium">event_type</th>
                      <th className="px-3 py-2 font-medium">product_id</th>
                      <th className="px-3 py-2 font-medium">timestamp</th>
                      <th className="px-3 py-2 font-medium">payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/70">
                    {events.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-slate-400" colSpan={6}>
                          No events yet. Use the simulator buttons to generate a live stream.
                        </td>
                      </tr>
                    )}
                    {events.map((event) => (
                      <tr key={event.event_id}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-300">{event.event_id}</td>
                        <td className="px-3 py-2 text-slate-300">{event.customer_id}</td>
                        <td className="px-3 py-2">
                          <Badge text={event.event_type} />
                        </td>
                        <td className="px-3 py-2 text-slate-300">{event.product_id}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <details className="rounded-xl bg-slate-800 p-2 shadow-md shadow-black/20">
                            <summary className="cursor-pointer text-xs font-medium text-slate-300 transition-colors duration-200 hover:text-slate-100">
                              View simulated API payload
                            </summary>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[11px] text-slate-100 shadow-lg shadow-indigo-950/20">
                              {JSON.stringify(toEventPayload(event), null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400/80">
                Event rows represent simulated API-style payloads only.
              </p>
            </div>
          </section>
        )}

        {activeTab === "Journey Execution Log" && (
          <section className="grid gap-4 lg:grid-cols-3">
            <ResultCard title="Journey decisioning">
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <p>
                    <span className="font-semibold text-slate-900">Current segment:</span>{" "}
                    <Badge text={journeyLog.segment} />
                  </p>
                  <ConfidenceBadge level={decisioningInsights.confidence} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Why this segment was selected
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{decisioningInsights.whySelected}</p>
                </div>
                <p>
                  <span className="font-semibold text-slate-900">Conversion likelihood:</span>{" "}
                  {decisioningInsights.conversionLikelihood}% likelihood to convert
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recommended strategy
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-900">Primary:</span>{" "}
                    {decisioningInsights.primaryStrategy}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Secondary:</span>{" "}
                    {decisioningInsights.secondaryStrategy}
                  </p>
                </div>
                <p className="text-xs text-slate-500">Mocked execution only. No real email is sent.</p>
              </div>
            </ResultCard>

            <ResultCard title="Agent Insight">
              <div className="space-y-3 text-sm leading-6 text-slate-700">
                <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-indigo-900">
                  Cart abandonment detected with high product affinity (
                  <span className="font-semibold">{profile.product_affinity}</span>).
                </p>
                <p>
                  Recommend urgency-based messaging rather than discount-first strategy to protect
                  margin while converting high-intent behavior.
                </p>
                <p>
                  SMS fallback should be queued for non-openers to increase recovery probability for
                  this segment.
                </p>
              </div>
            </ResultCard>

            <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
              <h2 className="text-base font-semibold">Execution steps</h2>
              <ol className="relative mt-4 space-y-3 pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-px before:bg-slate-700/80">
                {journeyLog.steps.map((step, index) => (
                  <li
                    key={step}
                    className="relative flex items-center justify-between gap-3 rounded-xl bg-slate-800/80 px-4 py-3 shadow-sm shadow-black/20 transition-all duration-200 hover:bg-slate-800"
                  >
                    <span
                      className={`absolute -left-[1.1rem] h-3 w-3 rounded-full ${
                        index <= 1
                          ? "bg-blue-400"
                          : index <= 3
                            ? "bg-indigo-400"
                            : "bg-emerald-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-slate-200">
                        {index + 1}. {step}
                      </p>
                      <p className="text-xs text-slate-400">
                        {getExecutionStepExplanation(step, events)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        index <= 1
                          ? "bg-blue-500/20 text-blue-300"
                          : index <= 3
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {index <= 1 ? "Evaluating" : index <= 3 ? "Queued" : "Success"}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">Next Actions</h3>
                <ol className="mt-3 space-y-2">
                  <li className="rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-slate-300 shadow-sm shadow-black/20">
                    <span className="font-semibold text-slate-100">1.</span> Wait 2 hours {"->"}
                    check email open
                  </li>
                  <li className="rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-slate-300 shadow-sm shadow-black/20">
                    <span className="font-semibold text-slate-100">2.</span> If no open {"->"} resend
                    with new subject
                  </li>
                  <li className="rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-slate-300 shadow-sm shadow-black/20">
                    <span className="font-semibold text-slate-100">3.</span> If open but no click
                    {"->"} send SMS
                  </li>
                  <li className="rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-slate-300 shadow-sm shadow-black/20">
                    <span className="font-semibold text-slate-100">4.</span> If purchase {"->"} exit
                    journey
                  </li>
                </ol>
              </div>
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">Queued journey action payloads</h3>
                <div className="mt-3 space-y-2">
                  {journeyActions.map((action, index) => (
                    <details
                      key={`${action.action_type}-${index}`}
                      className="rounded-xl bg-slate-800/80 p-3 shadow-md shadow-black/20"
                    >
                      <summary className="cursor-pointer text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-slate-100">
                        View simulated {action.action_type.toUpperCase()} payload
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[11px] text-slate-100 shadow-lg shadow-indigo-950/20">
                        {JSON.stringify(action, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400/80">
                  These are simulated API-style queued actions; no real messages are sent.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl bg-slate-800/85 p-5 shadow-md shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-900/30">
      <p className="text-sm font-medium text-slate-300/85">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-slate-100">{value}</p>
    </article>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl bg-slate-900/70 p-7 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-950/20">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/85 px-3 py-2 shadow-sm shadow-black/20">
      <dt className="font-mono text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-100">{value}</dd>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-full bg-slate-800 px-4 text-sm font-medium text-slate-200 shadow-sm shadow-black/20 transition-all duration-200 hover:bg-slate-700 hover:shadow-md hover:shadow-indigo-900/30 active:scale-[0.98]"
    >
      <span className="mr-1.5 text-indigo-300">●</span>
      {label}
    </button>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
      {text}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: DecisionConfidence }) {
  const styles: Record<DecisionConfidence, string> = {
    High: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Medium: "border-amber-200 bg-amber-50 text-amber-700",
    Low: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[level]}`}>
      {level} confidence
    </span>
  );
}

function toEventPayload(event: SimEvent): EventPayload {
  const category = event.event_type === "email_open" || event.event_type === "email_click"
    ? "Email"
    : "Apparel";
  const price = 129;

  return {
    customer_ids: {
      registered: "customer_001",
    },
    event_type: event.event_type,
    timestamp: event.timestamp,
    properties: {
      product_id: event.product_id,
      category,
      price,
    },
  };
}

function buildJourneyActions(segment: string, customerId: string): JourneyActionPayload[] {
  const productProperties = {
    product_id: "sku_101",
    category: "athleisure",
  };

  if (segment === "Cart Abandoner") {
    return [
      {
        customer_ids: {
          registered: customerId,
        },
        action_type: "email",
        campaign_id: "cart_recovery_flow",
        message_variant: "reminder_plus_incentive_v2",
        properties: productProperties,
        status: "queued_mock",
      },
      {
        customer_ids: {
          registered: customerId,
        },
        action_type: "sms",
        campaign_id: "cart_recovery_flow",
        message_variant: "short_urgency_reminder",
        properties: productProperties,
        status: "queued_mock",
        channel: "sms",
      },
    ];
  }

  if (segment === "High Intent Non-Buyer") {
    return [
      {
        customer_ids: {
          registered: customerId,
        },
        action_type: "email",
        campaign_id: "high_intent_recovery",
        message_variant: "social_proof_and_scarcity_v1",
        properties: productProperties,
        status: "queued_mock",
      },
    ];
  }

  return [
    {
      customer_ids: {
        registered: customerId,
      },
      action_type: "email",
      campaign_id: "browse_nurture",
      message_variant: "category_recommendation_v1",
      properties: productProperties,
      status: "queued_mock",
    },
  ];
}

function buildJourneyCanvasNodes(result: AgentResponse | null): JourneyNode[] {
  const campaignText = result?.campaignShell ?? "";
  const firstPersona =
    result?.personaVariants.find((variant) => variant.trim().length > 0) ??
    "High-intent shoppers with repeat product views and no purchase.";
  const firstMeasurement =
    result?.measurementPlan.find((item) => item.trim().length > 0) ??
    "Track conversion lift, AOV change, and recovery rate.";

  return [
    {
      title: "Entry Condition",
      description:
        campaignText || "Customer triggers high-intent behavior with repeated product interest.",
    },
    {
      title: "Customer Segment",
      description: firstPersona,
    },
    {
      title: "Prediction Model",
      description:
        result?.diagnosis ||
        "Purchase propensity model scores customer intent using recency and browse depth.",
    },
    {
      title: "Decision Split",
      description:
        "Route by propensity score and channel responsiveness into high-touch, nurture, or holdout paths.",
    },
    {
      title: "Email Variant",
      description:
        result?.personaVariants[1] ??
        "Send social-proof creative with urgency message tailored to affinity category.",
    },
    {
      title: "SMS Fallback",
      description:
        result?.personaVariants[2] ??
        "If no email engagement, queue concise SMS reminder with checkout CTA.",
    },
    {
      title: "Exit Condition",
      description:
        "Exit when purchase occurs, customer opts out, or journey time window closes.",
    },
    {
      title: "Measurement",
      description: firstMeasurement,
    },
  ];
}

function buildDecisioningInsights(
  eventStream: SimEvent[],
  segment: string,
): DecisioningInsights {
  const productViews = eventStream.filter((event) => event.event_type === "product_view").length;
  const hasCartAdd = eventStream.some((event) => event.event_type === "cart_add");
  const hasPurchase = eventStream.some((event) => event.event_type === "purchase");
  const hasEmailOpen = eventStream.some((event) => event.event_type === "email_open");
  const hasEmailClick = eventStream.some((event) => event.event_type === "email_click");

  if (segment === "Cart Abandoner") {
    return {
      whySelected:
        "Customer triggered Cart Abandoner due to cart_add event with no purchase within session.",
      conversionLikelihood: 68,
      confidence: "High",
      primaryStrategy: "Cart recovery with urgency + reminder",
      secondaryStrategy: "SMS fallback after 2h if no open",
    };
  }

  if (segment === "High Intent Non-Buyer") {
    return {
      whySelected:
        "Customer triggered High Intent Non-Buyer due to 2+ product_view events and no purchase event.",
      conversionLikelihood: 54,
      confidence: "Medium",
      primaryStrategy: "Behavior-based email with social proof and category relevance",
      secondaryStrategy: "SMS fallback after 2h if no open",
    };
  }

  if (hasPurchase) {
    return {
      whySelected:
        "Customer entered post-purchase state after purchase event and no further recovery trigger is needed.",
      conversionLikelihood: 82,
      confidence: "High",
      primaryStrategy: "Post-purchase cross-sell and loyalty reinforcement",
      secondaryStrategy: "SMS fallback for delivery and reorder reminders",
    };
  }

  const derivedLikelihood = Math.min(
    75,
    22 + productViews * 9 + (hasCartAdd ? 16 : 0) + (hasEmailOpen ? 8 : 0) + (hasEmailClick ? 10 : 0),
  );

  return {
    whySelected:
      "Customer remains in browsing state because no high-intent or cart-abandonment trigger was fully met.",
    conversionLikelihood: derivedLikelihood,
    confidence: "Low",
    primaryStrategy: "Nurture with personalized recommendations and proof points",
    secondaryStrategy: "SMS fallback after 2h if no open",
  };
}

function getExecutionStepExplanation(step: string, eventStream: SimEvent[]): string {
  const cartAddEvent = eventStream.find((event) => event.event_type === "cart_add");
  const fallbackSku = "SKU 101";
  const sku = cartAddEvent?.product_id?.replace("sku_", "SKU ") ?? fallbackSku;

  if (step === "Event received") {
    return `cart_add event captured for ${sku}`;
  }
  if (step === "Profile updated") {
    return "Customer profile updated with cart activity";
  }
  if (step === "Segment matched") {
    return "Matched to Cart Abandoner segment";
  }
  if (step === "Trigger evaluated") {
    return "Cart recovery trigger conditions met";
  }
  if (step === "Journey step selected") {
    return "Selected cart recovery flow";
  }
  if (step === "Email/SMS variant queued") {
    return "Queued urgency email + SMS fallback";
  }
  return "Execution step completed.";
}
