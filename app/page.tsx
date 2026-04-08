"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Rss } from "lucide-react";
import { Circular, GroupedCirculars, RelevanceKey } from "@/lib/types";
import { FilterChips } from "@/components/FilterChips";
import { FetchButton } from "@/components/FetchButton";
import { CategoryCard } from "@/components/CategoryCard";
import { InsightDrawer } from "@/components/InsightDrawer";
import { InsightSheet } from "@/components/InsightSheet";

const FETCH_MESSAGES = [
  "This may take a few minutes",
  "Connecting to RBI and SEBI portals",
  "Scraping latest circulars from RBI press releases",
  "Scraping RBI notifications and circulars",
  "Scraping SEBI circulars feed",
  "Filtering regulatory noise",
  "Sending circulars to AI for analysis",
  "This may take a few minutes",
  "Analysing relevance for Glomo's LRS operations",
  "Checking for FEMA and UAPA compliance impacts",
  "This may take a few minutes",
  "Assessing KYC and AML obligations",
  "Identifying action items for Compliance team",
  "Reviewing outward remittance implications",
  "Cross-checking IFSC licensing conditions",
  "Wrapping up analysis",
  "Almost done — finalising results",
];

function RotatingFetchMessage() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      // Fade out
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % FETCH_MESSAGES.length);
        setVisible(true);
        timerRef.current = setTimeout(cycle, 4600);
      }, 400); // 400ms fade-out, then swap text and fade in
    };
    timerRef.current = setTimeout(cycle, 4600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <span
      style={{
        transition: "opacity 0.4s ease",
        opacity: visible ? 1 : 0,
      }}
    >
      {FETCH_MESSAGES[index]}
    </span>
  );
}

const RELEVANCE_ORDER: RelevanceKey[] = ["HIGH", "MEDIUM", "LOW", "NOT_RELEVANT"];
const VISIBLE_BY_DEFAULT: RelevanceKey[] = ["HIGH", "MEDIUM", "LOW"];

interface FetchStatus {
  type: "fetching" | "success" | "idle";
  message?: string;
}

export default function Home() {
  const [grouped, setGrouped] = useState<GroupedCirculars>({
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    NOT_RELEVANT: [],
  });
  const [source, setSource] = useState<"all" | "RBI" | "SEBI">("all");
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ type: "idle" });
  const [isMobile, setIsMobile] = useState(false);

  // Drawer/sheet state
  const [showNotRelevant, setShowNotRelevant] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCirculars, setDrawerCirculars] = useState<Circular[]>([]);
  const [drawerIndex, setDrawerIndex] = useState(0);

  // Load persisted lastFetched only after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem("regwatch_last_fetched");
    if (stored) setLastFetched(new Date(stored));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadCirculars = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (source !== "all") params.set("source", source);
      const res = await fetch(`/api/circulars?${params}`);
      const data = await res.json();
      setGrouped(data);
    } catch (err) {
      console.error("Failed to load circulars:", err);
    }
    setLoading(false);
  }, [source]);

  useEffect(() => {
    loadCirculars();
  }, [loadCirculars]);

  const handleFetch = async () => {
    setFetching(true);
    setFetchStatus({ type: "fetching" });

    try {
      const res = await fetch("/api/fetch", { method: "POST" });
      const data = await res.json();
      const now = new Date();
      setLastFetched(now);
      localStorage.setItem("regwatch_last_fetched", now.toISOString());
      const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const msg = data.newCirculars === 0
        ? `No new circulars found · ${time}`
        : `${data.newCirculars} new circulars fetched · ${data.analysed} analysed · ${time}`;
      setFetchStatus({ type: "success", message: msg });
      await loadCirculars();
      setTimeout(() => setFetchStatus({ type: "idle" }), 5000);
    } catch {
      setFetchStatus({ type: "idle" });
    }

    setFetching(false);
  };

  const openDrawer = (circulars: Circular[], index: number) => {
    setDrawerCirculars(circulars);
    setDrawerIndex(index);
    setDrawerOpen(true);
  };

  const handleReviewed = useCallback((id: string) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const key of RELEVANCE_ORDER) {
        updated[key] = updated[key].map((c) =>
          c.id === id ? { ...c, reviewed: true } : c
        );
      }
      return updated;
    });
    // Update drawer circulars too
    setDrawerCirculars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, reviewed: true } : c))
    );
  }, []);

  // Unreviewed count excludes NOT_RELEVANT — those aren't action items
  const totalUnreviewed = VISIBLE_BY_DEFAULT.reduce(
    (acc, k) => acc + grouped[k].filter((c) => !c.reviewed).length,
    0
  );

  const visibleKeys = showNotRelevant ? RELEVANCE_ORDER : VISIBLE_BY_DEFAULT;
  const notRelevantCount = grouped["NOT_RELEVANT"].length;

  // Cooldown: disable Fetch Now for 6 hours after last fetch
  // Gated on `hydrated` so server and client render identically on first pass
  const COOLDOWN_MS = 6 * 60 * 60 * 1000;
  const msSinceFetch = hydrated && lastFetched ? Date.now() - lastFetched.getTime() : Infinity;
  const hasNoData = RELEVANCE_ORDER.every((k) => grouped[k].length === 0);
  const onCooldown = !hasNoData && msSinceFetch < COOLDOWN_MS;
  const nextRefreshLabel = (() => {
    if (!hydrated || !lastFetched || !onCooldown) return null;
    const remaining = COOLDOWN_MS - msSinceFetch;
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    return h > 0 ? `Next refresh in ${h}h ${m}m` : `Next refresh in ${m}m`;
  })();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#F9FAFB" }}>
      {/* ── LEFT SIDEBAR (desktop only) ── */}
      {!isMobile && (
        <aside
          style={{
            width: "220px",
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            borderRight: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: "column",
            padding: "0",
            height: "100vh",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              height: "56px",
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              borderBottom: "1px solid #E5E7EB",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
              Reg-shield
            </span>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#15803D",
                flexShrink: 0,
              }}
            />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 16px",
                height: "36px",
                backgroundColor: "#F3F4F6",
                borderLeft: "2px solid #111827",
                margin: "0 8px",
                borderRadius: "0 4px 4px 0",
                cursor: "pointer",
              }}
            >
              <Rss size={15} color="#111827" />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                Feed
              </span>
              {totalUnreviewed > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    backgroundColor: "#111827",
                    borderRadius: "10px",
                    padding: "1px 6px",
                  }}
                >
                  {totalUnreviewed}
                </span>
              )}
            </div>
          </nav>

        </aside>
      )}

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* TOP BAR */}
        <header
          style={{
            height: "56px",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 16px" : "0 24px",
            flexShrink: 0,
          }}
        >
          {isMobile ? (
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
              Reg-shield
            </span>
          ) : (
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
              Regulatory Feed
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!isMobile && hydrated && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                {lastFetched && (
                  <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                    Last fetched{" "}
                    {lastFetched.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {nextRefreshLabel && (
                  <span style={{ fontSize: "11px", color: "#D1D5DB" }}>
                    {nextRefreshLabel}
                  </span>
                )}
              </div>
            )}
            <FetchButton loading={fetching} disabled={onCooldown} onClick={handleFetch} />
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: isMobile ? "16px" : "24px", maxWidth: "860px" }}>
            {/* Filter chips */}
            <FilterChips selected={source} onChange={setSource} />

            {/* Fetch status banner */}
            {fetchStatus.type !== "idle" && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor:
                    fetchStatus.type === "success" ? "#F0FDF4" : "#F9FAFB",
                  color:
                    fetchStatus.type === "success" ? "#15803D" : "#6B7280",
                  border:
                    fetchStatus.type === "success"
                      ? "1px solid #BBF7D0"
                      : "1px solid #E5E7EB",
                }}
              >
                {fetchStatus.type === "fetching" && (
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "2px solid #D1D5DB",
                      borderTopColor: "#6B7280",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                )}
                {fetchStatus.type === "success" && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="7" fill="#16A34A" />
                    <path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {fetchStatus.type === "fetching"
                  ? <RotatingFetchMessage />
                  : fetchStatus.message}
              </div>
            )}

            {/* Category cards */}
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {loading ? (
                <div
                  style={{
                    padding: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Radix-style indeterminate spinner via CSS animation */}
                  <span
                    style={{
                      display: "inline-block",
                      width: "20px",
                      height: "20px",
                      border: "2px solid #E5E7EB",
                      borderTopColor: "#6B7280",
                      borderRadius: "50%",
                      animation: "spin 0.75s linear infinite",
                    }}
                  />
                </div>
              ) : RELEVANCE_ORDER.every((k) => grouped[k].length === 0) ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#374151", margin: "0 0 6px" }}>
                    No circulars yet
                  </p>
                  <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                    Click <strong style={{ color: "#111827" }}>Fetch Now</strong> to pull the latest circulars from RBI and IFSCA and run AI analysis.
                  </p>
                </div>
              ) : (
                <>
                  {visibleKeys.map((key) => (
                    <CategoryCard
                      key={key}
                      relevance={key}
                      circulars={grouped[key]}
                      defaultOpen={key === "HIGH"}
                      onCircularClick={openDrawer}
                      onReviewed={handleReviewed}
                    />
                  ))}

                  {/* NOT_RELEVANT toggle */}
                  {notRelevantCount > 0 && (
                    <button
                      onClick={() => setShowNotRelevant((v) => !v)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "6px 2px",
                        fontSize: "12px",
                        color: "#6B7280",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#E5E7EB",
                          flexShrink: 0,
                        }}
                      />
                      {showNotRelevant
                        ? `Hide ${notRelevantCount} not-relevant circulars`
                        : `Show ${notRelevantCount} not-relevant circulars`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM TAB BAR */}
        {isMobile && (
          <div
            style={{
              height: "56px",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <button
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                border: "none",
                background: "none",
                cursor: "pointer",
                borderTop: "2px solid #111827",
              }}
            >
              <Rss size={18} color="#111827" />
              <span style={{ fontSize: "10px", fontWeight: 500, color: "#111827" }}>
                Feed
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Drawer / Sheet */}
      {drawerOpen && (
        isMobile ? (
          <InsightSheet
            circulars={drawerCirculars}
            initialIndex={drawerIndex}
            onClose={() => setDrawerOpen(false)}
            onReviewed={handleReviewed}
          />
        ) : (
          <InsightDrawer
            circulars={drawerCirculars}
            initialIndex={drawerIndex}
            onClose={() => setDrawerOpen(false)}
            onReviewed={handleReviewed}
          />
        )
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
