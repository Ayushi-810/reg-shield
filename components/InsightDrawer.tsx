"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Circular, RelevanceKey } from "@/lib/types";
import { SourceBadge, RelevanceBadge, getRelevanceColor } from "./Badges";
import { CarouselSlide } from "./CarouselSlide";
import { useToast } from "./ToastProvider";

interface InsightDrawerProps {
  circulars: Circular[];
  initialIndex: number;
  onClose: () => void;
  onReviewed: (id: string) => void;
}

export function InsightDrawer({
  circulars,
  initialIndex,
  onClose,
  onReviewed,
}: InsightDrawerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [localCirculars, setLocalCirculars] = useState(circulars);
  const [showAllCaughtUp, setShowAllCaughtUp] = useState(false);
  const [marking, setMarking] = useState(false);
  const { showToast } = useToast();

  const current = localCirculars[index];
  const relevance = (current?.relevance ?? "LOW") as RelevanceKey;
  const color = getRelevanceColor(relevance);

  useEffect(() => {
    setIndex(initialIndex);
    setLocalCirculars(circulars);
  }, [circulars, initialIndex]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
      if (e.key === "ArrowRight" && index < localCirculars.length - 1)
        setIndex((i) => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, localCirculars.length, onClose]);

  const markReviewed = useCallback(async () => {
    if (!current || marking) return;
    setMarking(true);

    // Optimistic update
    setLocalCirculars((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, reviewed: true } : c))
    );
    onReviewed(current.id);
    showToast(`Marked as reviewed: ${current.title.slice(0, 48)}${current.title.length > 48 ? "…" : ""}`);

    try {
      await fetch(`/api/circulars/${current.id}/review`, { method: "PATCH" });
    } catch {
      setLocalCirculars((prev) =>
        prev.map((c) => (c.id === current.id ? { ...c, reviewed: false } : c))
      );
    }

    setMarking(false);

    const allReviewed = localCirculars.every(
      (c) => c.id === current.id || c.reviewed
    );
    if (allReviewed) {
      setShowAllCaughtUp(true);
      setTimeout(() => { onClose(); }, 1500);
    }
  }, [current, marking, localCirculars, onReviewed, onClose, showToast]);

  if (!current) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.15)",
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "560px",
          backgroundColor: "#FFFFFF",
          borderLeft: "1px solid #E5E7EB",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: "56px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {/* Left: relevance + source badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
            <RelevanceBadge relevance={relevance} />
            <SourceBadge source={current.source} />
          </div>

          {/* Center: prev / counter / next */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              style={{
                width: "28px", height: "28px", borderRadius: "6px",
                border: "1px solid #E5E7EB", background: "none",
                cursor: index === 0 ? "not-allowed" : "pointer",
                opacity: index === 0 ? 0.35 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6B7280",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: "12px", color: "#9CA3AF", minWidth: "36px", textAlign: "center" }}>
              {index + 1} / {localCirculars.length}
            </span>
            <button
              onClick={() => setIndex((i) => Math.min(localCirculars.length - 1, i + 1))}
              disabled={index === localCirculars.length - 1}
              style={{
                width: "28px", height: "28px", borderRadius: "6px",
                border: "1px solid #E5E7EB", background: "none",
                cursor: index === localCirculars.length - 1 ? "not-allowed" : "pointer",
                opacity: index === localCirculars.length - 1 ? 0.35 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6B7280",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Right: close */}
          <button
            onClick={onClose}
            style={{
              padding: "4px", border: "none", background: "none",
              cursor: "pointer", color: "#6B7280",
              display: "flex", alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {showAllCaughtUp ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="18" fill="#F3F4F6" />
                <path d="M10 18.5L15 23.5L26 12.5" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#9CA3AF" }}>
                All caught up
              </p>
            </div>
          ) : (
            <CarouselSlide circular={current} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            height: "56px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            flexShrink: 0,
          }}
        >
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "13px",
              color: "#6B7280",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            View Original <ExternalLink size={12} />
          </a>

          {!current.reviewed && (
            <button
              onClick={markReviewed}
              disabled={marking}
              style={{
                height: "32px",
                padding: "0 16px",
                backgroundColor: "#111827",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: marking ? "not-allowed" : "pointer",
                opacity: marking ? 0.7 : 1,
              }}
            >
              Mark as Reviewed
            </button>
          )}
        </div>

      </div>
    </>
  );
}
