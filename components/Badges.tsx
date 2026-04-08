"use client";

import { RelevanceKey } from "@/lib/types";

const RELEVANCE_STYLES: Record<RelevanceKey, { color: string; bg: string; label: string }> = {
  HIGH: { color: "#DC2626", bg: "#FEF2F2", label: "HIGH" },
  MEDIUM: { color: "#D97706", bg: "#FFFBEB", label: "MEDIUM" },
  LOW: { color: "#6B7280", bg: "#F9FAFB", label: "LOW" },
  NOT_RELEVANT: { color: "#D1D5DB", bg: "#F3F4F6", label: "NOT RELEVANT" },
};

export function RelevanceBadge({ relevance }: { relevance: RelevanceKey | null }) {
  const key = relevance ?? "LOW";
  const style = RELEVANCE_STYLES[key];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide rounded"
      style={{
        color: style.color,
        backgroundColor: style.bg,
        borderRadius: "4px",
        fontWeight: 600,
        letterSpacing: "0.06em",
      }}
    >
      {style.label}
    </span>
  );
}

const SOURCE_STYLES: Record<string, { color: string; bg: string }> = {
  RBI:  { color: "#92400E", bg: "#FEF3C7" },
  SEBI: { color: "#1E40AF", bg: "#EFF6FF" },
};

export function SourceBadge({ source }: { source: string }) {
  const style = SOURCE_STYLES[source] ?? { color: "#374151", bg: "#F3F4F6" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide"
      style={{
        color: style.color,
        backgroundColor: style.bg,
        borderRadius: "4px",
        fontWeight: 600,
        letterSpacing: "0.06em",
      }}
    >
      {source}
    </span>
  );
}

export function getRelevanceColor(relevance: RelevanceKey | null): string {
  return RELEVANCE_STYLES[relevance ?? "LOW"].color;
}

export function getRelevanceBg(relevance: RelevanceKey | null): string {
  return RELEVANCE_STYLES[relevance ?? "LOW"].bg;
}
