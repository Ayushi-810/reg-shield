"use client";

import { Circular, RelevanceKey } from "@/lib/types";
import { getRelevanceColor } from "./Badges";

interface CarouselSlideProps {
  circular: Circular;
}

export function CarouselSlide({ circular }: CarouselSlideProps) {
  const relevance = (circular.relevance ?? "LOW") as RelevanceKey;
  const color = getRelevanceColor(relevance);

  const formattedDate = new Date(circular.publishedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        padding: "24px",
        opacity: circular.reviewed ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {circular.reviewed && (
        <div
          style={{
            height: "32px",
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginBottom: "16px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="7" fill="#16A34A" />
            <path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: "11px", color: "#15803D", fontWeight: 600, letterSpacing: "0.04em" }}>
            Reviewed
          </span>
        </div>
      )}

      {/* Date */}
      <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{formattedDate}</span>

      {/* Title */}
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#111827",
          marginTop: "8px",
          marginBottom: 0,
          lineHeight: 1.4,
        }}
      >
        {circular.title}
      </h2>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#E5E7EB",
          margin: "16px 0",
        }}
      />

      {/* Summary */}
      {circular.summary && (
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9CA3AF",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Summary
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "#374151",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {circular.summary}
          </p>
        </div>
      )}

      {/* Why it matters */}
      {circular.whyItMatters && (
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9CA3AF",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Why It Matters to Glomo
          </p>
          <div
            style={{
              borderLeft: `3px solid ${color}`,
              paddingLeft: "12px",
              backgroundColor: "#F9FAFB",
              borderRadius: "0 4px 4px 0",
              padding: "12px 12px 12px 14px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#374151",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {circular.whyItMatters}
            </p>
          </div>
        </div>
      )}

      {/* Action Items */}
      {circular.actionItems && circular.actionItems.length > 0 && (
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9CA3AF",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Action Items
          </p>
          <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {circular.actionItems.map((item, idx) => (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: idx < circular.actionItems.length - 1 ? "16px" : 0,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#F3F4F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#374151",
                    marginTop: "1px",
                  }}
                >
                  {idx + 1}
                </span>
                <div>
                  <p style={{ fontSize: "13px", color: "#111827", margin: "0 0 4px" }}>
                    {item.task}
                  </p>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#374151",
                        backgroundColor: "#F3F4F6",
                        borderRadius: "4px",
                        padding: "1px 6px",
                      }}
                    >
                      {item.owner}
                    </span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                      {item.timeline}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* No analysis yet */}
      {!circular.analysed && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#F9FAFB",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
          }}
        >
          <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0, textAlign: "center" }}>
            Analysis pending — click "Fetch Now" to run AI analysis
          </p>
        </div>
      )}
    </div>
  );
}
