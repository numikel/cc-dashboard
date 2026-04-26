"use client";

import type { ThemeMode } from "@/hooks/use-theme";
import { useTheme } from "@/hooks/use-theme";

const OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" }
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm muted">
      <span>Theme</span>
      <select
        aria-label="Theme mode"
        className="rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-accent-strong)]"
        style={{
          background: "var(--color-panel)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
        value={mode}
        onChange={(event) => setMode(event.target.value as ThemeMode)}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
