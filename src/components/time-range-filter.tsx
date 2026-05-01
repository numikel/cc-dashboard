"use client";

export type TimeWindow = "1d" | "7d" | "30d" | "all";

interface TimeRangeFilterProps {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}

const OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Time range filter">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded-xl px-3 py-1.5 text-sm font-medium transition hover:opacity-90"
            style={
              isActive
                ? {
                    background: "var(--color-accent-strong)",
                    color: "var(--color-on-accent)",
                  }
                : {
                    background: "var(--color-bg-muted)",
                    color: "var(--color-text)",
                  }
            }
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
