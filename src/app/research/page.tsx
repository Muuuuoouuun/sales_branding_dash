"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  BadgeInfo,
  Brain,
  BookOpen,
  ChevronRight,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import styles from "./page.module.css";
import { SALES_LEGENDS, type SalesLegend } from "@/lib/salesTips";

type ResearchTab = "library" | "patterns" | "intel";
type MethodologyId = SalesLegend["id"];

type MethodologyDetail = {
  tagline: string;
  bestFor: string;
  useWhen: string;
  playbook: string[];
  questions: string[];
};

type PatternCard = {
  id: string;
  tag: string;
  methodology: MethodologyId;
  title: string;
  summary: string;
  signal: string;
  impact: string;
  usedBy: string;
  winRate: number;
  region: string;
};

type IntelCard = {
  id: string;
  urgency: "high" | "medium" | "low";
  region: string;
  title: string;
  summary: string;
  countermove: string;
  date: string;
};

const TABS: Array<{ id: ResearchTab; label: string; icon: React.ReactNode }> = [
  { id: "library", label: "Library", icon: <BookOpen size={14} /> },
  { id: "patterns", label: "Patterns", icon: <Star size={14} /> },
  { id: "intel", label: "Intel", icon: <ShieldAlert size={14} /> },
];

const METHODOLOGY_DETAILS: Record<MethodologyId, MethodologyDetail> = {
  Challenger: {
    tagline: "Challenge the status quo with a point of view the buyer can act on.",
    bestFor: "Complex BD motions where the customer needs reframing, not another feature tour.",
    useWhen: "Use when the deal is stuck in polite discovery and the team needs a sharper commercial angle.",
    playbook: [
      "Open with a commercial insight, not product history.",
      "Use constructive tension to make the hidden cost visible.",
      "Lead the customer to a new way of thinking before proposing a solution.",
    ],
    questions: [
      "What is the hidden cost of doing nothing?",
      "Which assumption is the buyer treating as fixed?",
      "What would change if the team accepted a different frame?",
    ],
  },
  SPIN: {
    tagline: "Let the buyer surface pain through disciplined questions.",
    bestFor: "Discovery-heavy pursuits where the team needs to convert vague interest into urgency.",
    useWhen: "Use when the account has a problem but the downside is not fully quantified.",
    playbook: [
      "Start with the current situation and keep the questions grounded.",
      "Move from problem to implication before introducing any payoff.",
      "Use need-payoff questions to let the buyer articulate the value.",
    ],
    questions: [
      "What is the current process and where does it break down?",
      "What is the business impact if the issue continues?",
      "What changes if this is solved this quarter?",
    ],
  },
  MEDDIC: {
    tagline: "Qualify the deal the way an operator would qualify a forecast.",
    bestFor: "Late-stage or enterprise motions that require evidence, sponsor coverage, and process clarity.",
    useWhen: "Use when the team needs to de-risk a large opportunity or verify forecast quality.",
    playbook: [
      "Verify the economic buyer early.",
      "Write the decision criteria before the team assumes them.",
      "Track the paper process so the forecast does not stall late.",
    ],
    questions: [
      "Who owns the budget and approval path?",
      "What criteria will decide the final choice?",
      "What proof is needed to move the deal forward?",
    ],
  },
  Sandler: {
    tagline: "Make mutual commitment explicit so the team can move fast without guessing.",
    bestFor: "High-friction opportunities that need stronger control of the sales process.",
    useWhen: "Use when the buyer is polite, the timeline is fuzzy, or the next step keeps slipping.",
    playbook: [
      "Set an upfront contract before the meeting ends.",
      "Treat pain and budget as separate questions.",
      "Use a clean no to reach a cleaner yes.",
    ],
    questions: [
      "What is the real pain behind the request?",
      "What happens if the team does nothing?",
      "Who is actually committed to the next step?",
    ],
  },
  General: {
    tagline: "Reusable operating rules that keep the field team aligned.",
    bestFor: "Cross-functional BD and ops work where the team needs a common baseline.",
    useWhen: "Use when the process matters as much as the pitch.",
    playbook: [
      "Keep the message simple enough for the field team to repeat.",
      "Use numbers that support the next action, not vanity metrics.",
      "Turn good patterns into shared operating rules.",
    ],
    questions: [
      "What is the one metric that changes the next move?",
      "What pattern is repeatable across accounts?",
      "What needs to be documented so the team can reuse it?",
    ],
  },
};

const GOLDEN_PATTERNS: PatternCard[] = [
  {
    id: "reframe-before-demo",
    tag: "Reframe",
    methodology: "Challenger",
    title: "Open with a commercial insight before the first demo",
    summary: "Teams that lead with a point of view turn passive discovery into active urgency.",
    signal: "The strongest reps in the book are the ones changing the buyer's frame early.",
    impact: "Reported lift in meeting-to-next-step conversion.",
    usedBy: "Top field reps",
    winRate: 78,
    region: "Seoul / Gyeonggi",
  },
  {
    id: "spin-implication-loop",
    tag: "Implication",
    methodology: "SPIN",
    title: "Use implication questions to surface the cost of delay",
    summary: "Once the buyer feels the downside, the conversation shifts from curiosity to urgency.",
    signal: "Three sequential implication questions consistently sharpened the need.",
    impact: "Shortened proposal drift in discovery-led deals.",
    usedBy: "Enterprise sellers",
    winRate: 85,
    region: "EMEA",
  },
  {
    id: "meddic-process-lock",
    tag: "Process",
    methodology: "MEDDIC",
    title: "Lock the decision process before the team assumes the path",
    summary: "Late-stage deals close faster when the approval path is written down early.",
    signal: "Paper process and economic buyer clarity were the biggest differentiators.",
    impact: "Reduced late-stage slippage in forecast reviews.",
    usedBy: "Ops-led sellers",
    winRate: 90,
    region: "Global",
  },
  {
    id: "sandler-contract",
    tag: "Commitment",
    methodology: "Sandler",
    title: "Set an upfront contract on every meeting",
    summary: "The team moves faster when the next step, pain, and timing are explicit.",
    signal: "The cleanest deals had the strongest mutual commitment upfront.",
    impact: "Improved show rate and reduced vague follow-up loops.",
    usedBy: "SDR + AE pods",
    winRate: 71,
    region: "APAC",
  },
];

const INTEL_CARDS: IntelCard[] = [
  {
    id: "intel-1",
    urgency: "high",
    region: "Gyeonggi North",
    title: "Pricing pressure is showing up earlier in the cycle",
    summary: "Several accounts are pushing for comparative pricing before the team has clarified outcome scope.",
    countermove: "Anchor the business cost first, then disclose price structure.",
    date: "2026-03-28",
  },
  {
    id: "intel-2",
    urgency: "medium",
    region: "Seoul Enterprise",
    title: "Decision makers are asking for a shorter approval trail",
    summary: "Multiple late-stage accounts want a cleaner paper process and fewer handoffs.",
    countermove: "Map the approval chain before the proposal goes out.",
    date: "2026-03-24",
  },
  {
    id: "intel-3",
    urgency: "low",
    region: "Busan / Ulsan",
    title: "AI-led positioning is resonating in new conversations",
    summary: "Accounts that see an operations use case are reacting better than accounts that see a demo pitch.",
    countermove: "Lead with workflow and adoption, not feature breadth.",
    date: "2026-03-20",
  },
];

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<ResearchTab>("library");
  const [query, setQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<MethodologyId | "All">("All");
  const focusMethod = selectedMethod === "All" ? "Challenger" : selectedMethod;

  const filteredLegends = useMemo(() => {
    return SALES_LEGENDS.filter((legend) => {
      if (!query) {
        return true;
      }

      return (
        matchesQuery(legend.id, query) ||
        matchesQuery(legend.name, query) ||
        matchesQuery(legend.title, query) ||
        matchesQuery(legend.bio, query)
      );
    });
  }, [query]);

  const filteredPatterns = useMemo(() => {
    return GOLDEN_PATTERNS.filter((pattern) => {
      const searchHit =
        !query ||
        matchesQuery(pattern.tag, query) ||
        matchesQuery(pattern.title, query) ||
        matchesQuery(pattern.summary, query) ||
        matchesQuery(pattern.methodology, query) ||
        matchesQuery(pattern.region, query);

      const methodologyHit = selectedMethod === "All" ? true : pattern.methodology === selectedMethod;

      return searchHit && methodologyHit;
    });
  }, [query, selectedMethod]);

  const filteredIntel = useMemo(() => {
    return INTEL_CARDS.filter((card) => {
      if (!query) {
        return true;
      }

      return (
        matchesQuery(card.region, query) ||
        matchesQuery(card.title, query) ||
        matchesQuery(card.summary, query) ||
        matchesQuery(card.countermove, query) ||
        matchesQuery(card.date, query)
      );
    });
  }, [query]);

  const activeSummary = useMemo(() => {
    const legendCount = filteredLegends.length;
    const patternCount = filteredPatterns.length;
    const intelCount = filteredIntel.length;
    return [
      { label: "Library", value: `${legendCount} methods` },
      { label: "Patterns", value: `${patternCount} plays` },
      { label: "Intel", value: `${intelCount} signals` },
    ];
  }, [filteredIntel.length, filteredLegends.length, filteredPatterns.length]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Research Hub</p>
          <h1 className={styles.title}>BD enablement library, winning patterns, and field intel</h1>
          <p className={styles.subtitle}>
            A working reference for the team, built to turn field observations into repeatable operating rules.
          </p>
        </div>
        <div className={styles.summaryRow}>
          {activeSummary.map((item) => (
            <div key={item.label} className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{item.label}</span>
              <span className={styles.summaryValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </header>

      <section className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search methods, patterns, or intel..."
            aria-label="Search research content"
          />
        </label>

        <div className={styles.methodChips} role="tablist" aria-label="Focus methodology">
          {(["All", ...SALES_LEGENDS.map((legend) => legend.id)] as Array<"All" | MethodologyId>).map((method) => (
            <button
              key={method}
              type="button"
              className={`${styles.methodChip} ${selectedMethod === method ? styles.methodChipActive : ""}`}
              onClick={() => setSelectedMethod(method)}
            >
              {method}
            </button>
          ))}
        </div>
      </section>

      <nav className={styles.tabBar} aria-label="Research tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "library" && (
        <div className={styles.libraryLayout}>
          <section className={styles.libraryGrid}>
            {filteredLegends.length === 0 ? (
              <EmptyState
                title="No methods matched"
                description="Try a shorter search term or switch focus to a different playbook."
              />
            ) : (
              filteredLegends.map((legend) => {
                const detail = METHODOLOGY_DETAILS[legend.id];
                const isActive = selectedMethod === legend.id;

                return (
                  <article
                    key={legend.id}
                    className={`${styles.methodCard} ${isActive ? styles.methodCardActive : ""}`}
                    style={{ borderColor: isActive ? legend.color : undefined }}
                  >
                    <button
                      type="button"
                      className={styles.methodHeader}
                      onClick={() => setSelectedMethod(legend.id)}
                    >
                      <div className={styles.methodIdentity}>
                        <span className={styles.methodEmoji} style={{ background: legend.colorBg }}>
                          {legend.emoji}
                        </span>
                        <div>
                          <div className={styles.methodNameRow}>
                            <span className={styles.methodName}>{legend.title}</span>
                            <ChevronRight size={14} className={styles.methodArrow} />
                          </div>
                          <div className={styles.methodOwner}>{legend.name}</div>
                        </div>
                      </div>
                      <span className={styles.methodId} style={{ color: legend.color }}>
                        {legend.id}
                      </span>
                    </button>

                    <p className={styles.methodTagline}>{detail.tagline}</p>
                    <p className={styles.methodBio}>{legend.bio}</p>

                    <div className={styles.methodPills}>
                      <span className={styles.metaPill}>{detail.bestFor}</span>
                      <span className={styles.metaPill}>Use when: {detail.useWhen}</span>
                    </div>

                    {isActive ? (
                      <div className={styles.methodDetail}>
                        <div>
                          <div className={styles.sectionLabel}>
                            <Target size={12} /> Core questions
                          </div>
                          <ul className={styles.list}>
                            {detail.questions.map((question) => (
                              <li key={question}>{question}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className={styles.sectionLabel}>
                            <Sparkles size={12} /> Playbook
                          </div>
                          <ul className={styles.list}>
                            {detail.playbook.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ul>
                        </div>

                        <div className={styles.quoteBlock}>
                          <div className={styles.sectionLabel}>
                            <BadgeInfo size={12} /> Signature move
                          </div>
                          <p>{legend.signatureMove}</p>
                          <blockquote>{legend.quotes[0]}</blockquote>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>

          <aside className={styles.sideRail}>
            <div className={styles.sideCard}>
              <div className={styles.sideHeader}>
                <Brain size={15} />
                <span>Current focus</span>
              </div>
              <h2>{focusMethod}</h2>
              <p>{METHODOLOGY_DETAILS[focusMethod].useWhen}</p>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideHeader}>
                <Award size={15} />
                <span>Field rule</span>
              </div>
              <p>{METHODOLOGY_DETAILS[focusMethod].tagline}</p>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "patterns" && (
        <section className={styles.patternGrid}>
          {filteredPatterns.length === 0 ? (
            <EmptyState title="No patterns matched" description="Try a different method or keyword to surface a stronger play." />
          ) : (
            filteredPatterns.map((pattern) => (
              <article key={pattern.id} className={styles.patternCard}>
                <div className={styles.patternTop}>
                  <span className={styles.patternTag}>{pattern.tag}</span>
                  <span className={styles.patternMethod}>{pattern.methodology}</span>
                </div>
                <h3 className={styles.patternTitle}>{pattern.title}</h3>
                <p className={styles.patternDesc}>{pattern.summary}</p>
                <p className={styles.patternSignal}>{pattern.signal}</p>
                <div className={styles.patternFooter}>
                  <div>
                    <span className={styles.patternMetric}>{pattern.winRate}%</span>
                    <span className={styles.patternMetricLabel}>win rate</span>
                  </div>
                  <div className={styles.patternMeta}>
                    <span>{pattern.usedBy}</span>
                    <span>{pattern.region}</span>
                    <span>{pattern.impact}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "intel" && (
        <section className={styles.intelLayout}>
          <div className={styles.intelLead}>
            <div className={styles.sideHeader}>
              <ShieldAlert size={15} />
              <span>Market watchlist</span>
            </div>
            <h2>Signals that should shape the next BD move</h2>
            <p>
              These notes are meant to keep the field team focused on current pressure points, not to create a separate research theater.
            </p>
          </div>

          <div className={styles.intelList}>
            {filteredIntel.length === 0 ? (
              <EmptyState title="No intel matched" description="Try another keyword to surface the current watchlist." />
            ) : (
              filteredIntel.map((card) => (
                <article key={card.id} className={`${styles.intelCard} ${styles[`intel${card.urgency}`]}`}>
                  <div className={styles.intelTop}>
                    <div className={styles.intelBadgeWrap}>
                      <span className={styles.intelBadge}>{card.urgency.toUpperCase()}</span>
                      <span className={styles.intelRegion}>{card.region}</span>
                    </div>
                    <span className={styles.intelDate}>{card.date}</span>
                  </div>
                  <h3 className={styles.intelTitle}>{card.title}</h3>
                  <p className={styles.intelDesc}>{card.summary}</p>
                  <div className={styles.counterBox}>
                    <span className={styles.counterLabel}>Next move</span>
                    <span className={styles.counterText}>{card.countermove}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.emptyState}>
      <Sparkles size={16} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
