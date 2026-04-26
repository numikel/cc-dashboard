interface SessionRow {
  id: string;
  projectName: string;
  model: string | null;
  startedAt: string | null;
  durationSeconds: number;
  totalTokens: number;
  toolCalls: number;
}

export function SessionTable({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return <div className="panel p-6 muted">No sessions indexed yet. Run a sync to load Claude Code metadata.</div>;
  }

  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead style={{ background: "var(--color-bg-muted)" }}>
          <tr>
            <th scope="col" className="px-4 py-3">Project</th>
            <th scope="col" className="px-4 py-3">Model</th>
            <th scope="col" className="px-4 py-3">Started</th>
            <th scope="col" className="px-4 py-3">Duration</th>
            <th scope="col" className="px-4 py-3">Tokens</th>
            <th scope="col" className="px-4 py-3">Tools</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-t hover:bg-bg-muted" style={{ borderColor: "var(--color-border-soft)" }}>
              <td className="px-4 py-3 font-medium">{session.projectName}</td>
              <td className="px-4 py-3 muted">{session.model ?? "unknown"}</td>
              <td className="px-4 py-3 muted">{session.startedAt ? new Date(session.startedAt).toLocaleString() : "unknown"}</td>
              <td className="px-4 py-3 muted">{Math.round(session.durationSeconds / 60)}m</td>
              <td className="px-4 py-3">{session.totalTokens.toLocaleString()}</td>
              <td className="px-4 py-3 muted">{session.toolCalls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
