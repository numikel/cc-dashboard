import { SessionTable } from "@/components/session-table";
import { listSessions } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = await Promise.resolve(listSessions(100, 0));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Sessions</h2>
        <p className="mt-1 muted">Recent Claude Code sessions indexed from local JSONL metadata.</p>
      </div>
      <SessionTable sessions={sessions} />
    </div>
  );
}
