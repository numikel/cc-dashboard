import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "var(--color-accent)",
        "accent-strong": "var(--color-accent-strong)",
        bg: "var(--color-bg)",
        "bg-muted": "var(--color-bg-muted)",
        panel: "var(--color-panel)",
        "panel-strong": "var(--color-panel-strong)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        "border-soft": "var(--color-border-soft)",
        "on-accent": "var(--color-on-accent)",
        "terminal-text": "var(--color-terminal-text)"
      },
      borderRadius: {
        panel: "var(--radius-panel)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)"
      }
    }
  }
};

export default config;
