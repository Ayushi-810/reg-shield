"use client";

import { RefreshCw } from "lucide-react";

interface FetchButtonProps {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function FetchButton({ loading, disabled = false, onClick }: FetchButtonProps) {
  const isDisabled = loading || disabled;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={disabled && !loading ? "Feeds were recently fetched. Come back later for new circulars." : undefined}
      style={{
        height: "32px",
        padding: "0 14px",
        borderRadius: "6px",
        border: `1px solid ${disabled && !loading ? "#E5E7EB" : "#111827"}`,
        backgroundColor: "transparent",
        color: disabled && !loading ? "#D1D5DB" : "#111827",
        fontSize: "13px",
        fontWeight: 500,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: loading ? 0.7 : 1,
        minWidth: "120px",
        justifyContent: "center",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      <RefreshCw
        size={13}
        style={{
          animation: loading ? "spin 1s linear infinite" : "none",
        }}
      />
      {loading ? "Fetching" : "Fetch Now"}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
