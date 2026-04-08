"use client";

import { Circular, RelevanceKey } from "@/lib/types";
import { SourceBadge, getRelevanceColor } from "./Badges";

interface AlertRowProps {
  circular: Circular;
  onClick: () => void;
  isLast: boolean;
}

export function AlertRow({ circular, onClick, isLast }: AlertRowProps) {
  const relevance = (circular.relevance ?? "LOW") as RelevanceKey;
  const barColor = circular.reviewed ? "#E5E7EB" : getRelevanceColor(relevance);

  const formattedDate = new Date(circular.publishedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "stretch",
        height: "64px",
        cursor: "pointer",
        borderBottom: isLast ? "none" : "1px solid #E5E7EB",
        backgroundColor: "transparent",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F9FAFB";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Left color bar */}
      <div
        style={{
          width: "3px",
          flexShrink: 0,
          backgroundColor: barColor,
          borderRadius: "2px 0 0 2px",
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: circular.reviewed ? "#9CA3AF" : "#111827",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {circular.title}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "4px",
          }}
        >
          <SourceBadge source={circular.source} />
          {circular.summary && (
            <span
              style={{
                fontSize: "13px",
                color: circular.reviewed ? "#9CA3AF" : "#6B7280",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {circular.summary}
            </span>
          )}
        </div>
      </div>

      {/* Right: date or reviewed */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 16px 0 8px",
        }}
      >
        {circular.reviewed ? (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="6.5" fill="#E5E7EB" />
              <path d="M3.5 6.8L5.2 8.5L9.5 4.2" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Reviewed</span>
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{formattedDate}</span>
        )}
      </div>
    </div>
  );
}
