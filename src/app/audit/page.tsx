import { getActiveSessions } from "@/lib/claude/active-sessions";
import { getLastSyncStatus } from "@/lib/sync/indexer";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const status = getLastSyncStatus();
  const activeSessions = await getActiveSessions();

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="panel p-5">
        <h2 className="text-2xl font-semibold">Sync audit</h2>
        {status ? (
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="muted">Scanned files</dt>
              <dd>{status.scannedFiles}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Indexed files</dt>
              <dd>{status.indexedFiles}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Skipped files</dt>
              <dd>{status.skippedFiles}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Failed files</dt>
              <dd>{status.failedFiles}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 muted">No sync has been run yet.</p>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="text-2xl font-semibold">Active sessions</h2>
        <div className="mt-4 grid gap-3">
          {activeSessions.length === 0 ? (
            <p className="muted">No active sessions found.</p>
          ) : (
            activeSessions.map((session) => (
              <article key={session.id} className="rounded-xl border p-3" style={{ borderColor: "var(--color-border-soft)" }}>
                <p className="font-medium">{session.name ?? session.id}</p>
                <p className="text-sm muted">{session.status ?? "unknown"} {session.pid ? `PID ${session.pid}` : ""}</p>
                {session.cwd ? <p className="mt-1 break-all text-xs muted">{session.cwd}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
