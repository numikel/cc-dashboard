"use client";

interface ProjectCostRow {
  name: string;
  path: string;
  costUsd: number | null;
  sessions: number;
}

function formatCost(usd: number | null): string {
  if (usd === null) return "–";
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function TopProjectsCost({ projects }: { projects: ProjectCostRow[] }) {
  if (projects.length === 0) {
    return (
      <div className="panel p-6 muted">No project data yet.</div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
            <th
              className="px-5 py-3 text-xs font-medium muted uppercase tracking-wide"
              scope="col"
            >
              Project
            </th>
            <th
              className="px-5 py-3 text-xs font-medium muted uppercase tracking-wide text-right"
              scope="col"
            >
              Sessions
            </th>
            <th
              className="px-5 py-3 text-xs font-medium muted uppercase tracking-wide text-right"
              scope="col"
            >
              Cost (est.)
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <tr
              key={project.path}
              style={{
                borderBottom:
                  index < projects.length - 1
                    ? "1px solid var(--color-border-soft)"
                    : undefined
              }}
            >
              <td className="px-5 py-3">
                <p className="font-medium truncate max-w-xs" title={project.name}>
                  {project.name}
                </p>
                <p className="text-xs muted break-all">{project.path}</p>
              </td>
              <td className="px-5 py-3 text-right tabular-nums">
                {project.sessions}
              </td>
              <td className="px-5 py-3 text-right tabular-nums font-medium">
                {formatCost(project.costUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
