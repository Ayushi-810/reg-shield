"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Circular, RelevanceKey } from "@/lib/types";
import { getRelevanceColor, getRelevanceBg } from "./Badges";
import { AlertRow } from "./AlertRow";

const RELEVANCE_LABELS: Record<RelevanceKey, string> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NOT_RELEVANT: "NOT RELEVANT",
};

interface CategoryCardProps {
  relevance: RelevanceKey;
  circulars: Circular[];
  defaultOpen?: boolean;
  onCircularClick: (circulars: Circular[], index: number) => void;
  onReviewed: (id: string) => void;
}

export function CategoryCard({
  relevance,
  circulars,
  defaultOpen = false,
  onCircularClick,
  onReviewed,
}: CategoryCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const color = getRelevanceColor(relevance);
  const bg = getRelevanceBg(relevance);

  const unreviewed = circulars.filter((c) => !c.reviewed);
  const reviewed = circulars.filter((c) => c.reviewed);

  // Unreviewed first, then reviewed
  const sorted = [...unreviewed, ...reviewed];
  const preview = showAll ? sorted : sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  if (circulars.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {RELEVANCE_LABELS[relevance]}
          </span>

          {unreviewed.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color,
                backgroundColor: bg,
                borderRadius: "20px",
                padding: "2px 8px",
              }}
            >
              {unreviewed.length} unreviewed
            </span>
          )}

          {reviewed.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#6B7280",
                backgroundColor: "#F3F4F6",
                borderRadius: "20px",
                padding: "2px 8px",
              }}
            >
              {reviewed.length} reviewed
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          color="#9CA3AF"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Body */}
      {open && (
        <div style={{ borderTop: "1px solid #E5E7EB" }}>
          {preview.map((c, i) => (
            <AlertRow
              key={c.id}
              circular={c}
              onClick={() => onCircularClick(sorted, sorted.indexOf(c))}
              isLast={i === preview.length - 1 && !hasMore}
            />
          ))}

          {hasMore && !showAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCircularClick(sorted, 0);
              }}
              style={{
                width: "100%",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderTop: "1px solid #E5E7EB",
                background: "none",
                fontSize: "13px",
                color: "#6B7280",
                cursor: "pointer",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#111827";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#6B7280";
              }}
            >
              Show all {sorted.length} circulars →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
