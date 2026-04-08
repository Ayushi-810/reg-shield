"use client";

type Source = "all" | "RBI" | "SEBI";

interface FilterChipsProps {
  selected: Source;
  onChange: (source: Source) => void;
}

const SOURCES: { value: Source; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "RBI", label: "RBI" },
  { value: "SEBI", label: "SEBI" },
];

export function FilterChips({ selected, onChange }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
      {SOURCES.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          style={{
            height: "28px",
            borderRadius: "20px",
            padding: "0 14px",
            fontSize: "13px",
            fontWeight: 500,
            border: selected === s.value ? "none" : "1px solid #E5E7EB",
            backgroundColor: selected === s.value ? "#111827" : "#FFFFFF",
            color: selected === s.value ? "#FFFFFF" : "#6B7280",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
