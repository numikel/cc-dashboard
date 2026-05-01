import type { Metadata } from "next";
import { SessionTable } from "@/components/session-table";
import { listSessions } from "@/lib/api/queries";
import { getPricingMap, getRates, computeSessionCost } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Sessions · CC dashboard",
};

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = listSessions(100, 0);
  const pricingMap = await getPricingMap();

  const sessionsWithCost = sessions.map((s) => ({
    ...s,
    costUsd: computeSessionCost(
      getRates(pricingMap, s.model ?? ""),
      s.inputTokens,
      s.outputTokens,
      s.cacheReadTokens,
      s.cacheWriteTokens
    )
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Sessions</h2>
        <p className="mt-1 muted">Recent Claude Code sessions indexed from local JSONL metadata.</p>
      </div>
      <SessionTable sessions={sessionsWithCost} />
    </div>
  );
}
