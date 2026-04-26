"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="panel p-6">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 muted">{error.message || "An unexpected error occurred."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-xl px-4 py-2 text-sm font-medium bg-accent-strong text-on-accent"
      >
        Try again
      </button>
    </div>
  );
}
